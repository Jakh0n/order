import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { type ExtractedMenu, extractedMenuSchema } from "@/lib/ai/menu-schema";

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
- Ignore phone numbers, addresses, opening hours and decorations.`;

/** Photos (data URLs) and/or pasted text → structured menu. Throws on API errors. */
export async function readMenu(input: {
  images: string[];
  text: string;
  currency: string;
}): Promise<ExtractedMenu> {
  const content = [
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

  const response = await openai().responses.parse({
    model: MODEL(),
    instructions: INSTRUCTIONS,
    input: [{ role: "user", content }],
    text: { format: zodTextFormat(extractedMenuSchema, "menu") },
  });
  if (!response.output_parsed) throw new Error("AI returned no menu");
  return response.output_parsed;
}
