import type { ImportDraft } from "@/lib/ai/menu-schema";
import { currencyDigits } from "@/lib/money";

// Menu as a spreadsheet — one dish per row, the same format for export and import:
//   Category, Name, Description, Price, Options
// Options: "Size*=Small:0|Large:5000; Extras=Cheese:3000"
//   group "=" options separated by "|", each "name:extra price"; groups separated by ";";
//   "*" after the group name = the customer must choose (one option).
// Prices are in MAJOR units (8.99, 25000), like the AI import draft.

export const MENU_CSV_HEADER = ["Category", "Name", "Description", "Price", "Options"] as const;

/** Header aliases (English + the words owners are likely to type in ru / uz) */
const COLUMN_ALIASES: Record<(typeof MENU_CSV_HEADER)[number], string[]> = {
  Category: ["category", "категория", "kategoriya", "bo'lim", "раздел"],
  Name: ["name", "dish", "product", "название", "блюдо", "nomi", "taom", "nom"],
  Description: ["description", "описание", "tavsif", "izoh"],
  Price: ["price", "цена", "narx", "narxi"],
  Options: ["options", "варианты", "опции", "variantlar"],
};

export type MenuCsvProblem = { kind: "empty" } | { kind: "noNameColumn" } | { kind: "tooMany" };

export type MenuCsvResult =
  | { ok: true; draft: ImportDraft; rows: number; badPrices: number }
  | { ok: false; problem: MenuCsvProblem };

/** RFC 4180 parser; the delimiter (",", ";" or tab — Excel uses ";" in many locales) is guessed from the first line */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delimiter = counts.reduce((best, c) => (c[1] > best[1] ? c : best))[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** "25 000", "25,000", "8,99", "$8.99" → number in major units; null if it isn't a price */
export function parsePrice(raw: string, currency: string): number | null {
  const s = raw.replace(/[\s ']/g, "").replace(/[^\d.,-]/g, "");
  if (!s || !/\d/.test(s)) return null;
  let normalized: string;
  if (currencyDigits(currency) === 0) {
    // No minor units (UZS, KRW, JPY): every separator is a thousands separator
    normalized = s.replace(/[.,]/g, "");
  } else if (s.includes(",") && s.includes(".")) {
    // The last separator is the decimal one
    normalized =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    // "8,99" decimal; "25,000" thousands
    normalized =
      /,\d{3}$/.test(s) && !/,\d{1,2}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "25.000" / "1.250.000": dots as thousands separators (common in uz / ru price lists)
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

type DraftItem = ImportDraft["categories"][number]["items"][number];

/** "Size*=Small:0|Large:5000; Extras=Cheese:3000" → option groups (bad parts are skipped) */
export function parseOptions(raw: string, currency: string): DraftItem["optionGroups"] {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq <= 0) return null;
      let name = part.slice(0, eq).trim();
      const required = name.endsWith("*");
      if (required) name = name.slice(0, -1).trim();
      const options = part
        .slice(eq + 1)
        .split("|")
        .map((o) => o.trim())
        .filter(Boolean)
        .map((o) => {
          const colon = o.lastIndexOf(":");
          const optName = (colon > 0 ? o.slice(0, colon) : o).trim().slice(0, 60);
          const price = colon > 0 ? (parsePrice(o.slice(colon + 1), currency) ?? 0) : 0;
          return optName ? { name: optName, price } : null;
        })
        .filter((o): o is { name: string; price: number } => o !== null)
        .slice(0, 30);
      if (!name || options.length === 0) return null;
      return {
        name: name.slice(0, 60),
        required,
        // Required = pick one; optional = any number of extras
        maxSelect: required ? 1 : Math.min(options.length, 20),
        options,
      };
    })
    .filter((g): g is DraftItem["optionGroups"][number] => g !== null)
    .slice(0, 10);
}

/** Spreadsheet rows → the same draft the AI import produces (the owner reviews it before saving) */
export function menuFromCsv(
  text: string,
  currency: string,
  fallbackCategory: string,
): MenuCsvResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, problem: { kind: "empty" } };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (key: keyof typeof COLUMN_ALIASES) =>
    header.findIndex((h) => COLUMN_ALIASES[key].includes(h));
  const idx = {
    category: col("Category"),
    name: col("Name"),
    description: col("Description"),
    price: col("Price"),
    options: col("Options"),
  };
  if (idx.name === -1) return { ok: false, problem: { kind: "noNameColumn" } };

  const cell = (row: string[], i: number) => (i === -1 ? "" : (row[i] ?? "").trim());
  const categories = new Map<string, ImportDraft["categories"][number]>();
  let badPrices = 0;
  let count = 0;

  for (const row of rows.slice(1)) {
    const name = cell(row, idx.name).slice(0, 100);
    if (!name) continue;
    const categoryName = (cell(row, idx.category) || fallbackCategory).slice(0, 60);
    const key = categoryName.toLowerCase();
    const category = categories.get(key) ?? { name: categoryName, items: [] };
    if (!categories.has(key)) {
      if (categories.size >= 50) return { ok: false, problem: { kind: "tooMany" } };
      categories.set(key, category);
    }
    // Same dish twice in one category: keep the first
    if (category.items.some((i) => i.name.toLowerCase() === name.toLowerCase())) continue;
    if (category.items.length >= 200) return { ok: false, problem: { kind: "tooMany" } };

    const rawPrice = cell(row, idx.price);
    const price = parsePrice(rawPrice, currency);
    if (rawPrice && price === null) badPrices++;
    category.items.push({
      name,
      description: cell(row, idx.description).slice(0, 500) || null,
      price: price ?? 0,
      optionGroups: parseOptions(cell(row, idx.options), currency),
    });
    count++;
  }

  if (count === 0) return { ok: false, problem: { kind: "empty" } };
  return { ok: true, draft: { categories: [...categories.values()] }, rows: count, badPrices };
}

/** Option groups → "Size*=Small:0|Large:5000; Extras=Cheese:3000" (major units) */
export function formatOptions(
  groups: { name: string; required: boolean; options: { name: string; price: number }[] }[],
): string {
  return groups
    .map(
      (g) =>
        `${g.name}${g.required ? "*" : ""}=${g.options.map((o) => `${o.name}:${o.price}`).join("|")}`,
    )
    .join("; ");
}
