import "server-only";

import OpenAI from "openai";
import { partialParse } from "openai/_vendor/partial-json-parser/parser.mjs";
import { zodTextFormat } from "openai/helpers/zod";

import { type ExtractedMenu, extractedMenuSchema, type MenuProgress } from "@/lib/ai/menu-schema";

// AI calls run only on the server (the key never reaches the browser).

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const MODEL = () => process.env.OPENAI_MODEL || "gpt-4.1-mini";

const INSTRUCTIONS = `You read restaurant / cafe menus from photos or text and return them as structured data.
Rules:
- Keep dish and category names exactly as written (same language and spelling). Do not translate.
- Group dishes under the menu's own categories; if there are none, use one category named after the menu's main section.
- price: the number shown for the dish in the menu currency, as a decimal (e.g. 8.99 or 25000). Never invent prices: if a dish has no visible price, use null.
- If a dish lists sizes or variants with different prices (e.g. S 10 / M 12 / L 14), set price to the cheapest one and add a required option group (maxSelect 1) whose option prices are the difference from that cheapest price (0, 2, 4).
- Extras with their own price ("+cheese 1") go into an optional option group; maxSelect = number of extras.
- description: the short text under the dish, or null. Do not write descriptions yourself.
- Option group and option names are in the menu's language too (e.g. an Uzbek menu: "O'lcham", "Qo'shimcha"; Russian: "Размер", "Добавки").
- Ignore phone numbers, addresses, opening hours and decorations.
- Return EVERY dish you can see — menus often have 50–150 items. Never summarize, merge or skip dishes, even similar ones.
- Images can be overlapping crops of the same page, in reading order (top to bottom, left to right). A dish visible in two crops must be listed only once, under its category.`;

function contentOf(input: { images: string[]; text: string; currency: string }) {
  return [
    {
      type: "input_text" as const,
      text: `Store currency: ${input.currency}.${input.text ? `\nMenu text from the owner:\n${input.text}` : ""}`,
    },
    ...input.images.map((url) => ({
      type: "input_image" as const,
      image_url: url,
      detail: "high" as const,
    })),
  ];
}

/**
 * Only finished dishes: a dish counts once its last field (optionGroups) has started, so
 * half-typed names never flash on screen.
 */
function progressOf(partial: unknown): MenuProgress {
  const cats = (partial as { categories?: unknown })?.categories;
  if (!Array.isArray(cats)) return { categories: [] };
  return {
    categories: cats
      .map((c) => ({
        name: typeof c?.name === "string" ? c.name.slice(0, 60) : "",
        items: (Array.isArray(c?.items) ? c.items : [])
          .filter((i: unknown) => i && typeof i === "object" && "optionGroups" in i)
          .map((i: { name?: unknown; price?: unknown }) => ({
            name: typeof i.name === "string" ? i.name.slice(0, 100) : "",
            price: typeof i.price === "number" ? i.price : null,
          }))
          .filter((i: { name: string }) => i.name),
      }))
      .filter((c) => c.name),
  };
}

/** Same as readMenu, but reports finished dishes while the answer streams in */
export async function streamMenu(
  input: { images: string[]; text: string; currency: string },
  onProgress: (progress: MenuProgress) => void,
): Promise<ExtractedMenu> {
  const stream = openai().responses.stream({
    model: MODEL(),
    instructions: INSTRUCTIONS,
    input: [{ role: "user", content: contentOf(input) }],
    text: { format: zodTextFormat(extractedMenuSchema, "menu") },
  });

  let text = "";
  let lastCount = -1;
  let lastSent = 0;
  for await (const event of stream) {
    if (event.type !== "response.output_text.delta") continue;
    text += event.delta;
    const now = Date.now();
    if (now - lastSent < 400) continue; // a few updates a second is plenty
    let partial: unknown;
    try {
      partial = partialParse(text);
    } catch {
      continue; // not parseable yet
    }
    const progress = progressOf(partial);
    const count = progress.categories.reduce((n, c) => n + c.items.length, 0);
    if (count !== lastCount) {
      lastCount = count;
      lastSent = now;
      onProgress(progress);
    }
  }
  const final = await stream.finalResponse();
  if (!final.output_parsed) throw new Error("AI returned no menu");
  return final.output_parsed;
}
