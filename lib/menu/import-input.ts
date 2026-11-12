import "server-only";

import sharp from "sharp";

export const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // after the browser shrinks them
/** Crops per request: enough for 5 dense pages */
const MAX_TILES = 16;
const MAX_TEXT = 8000;

export type ImportInputError = "invalid";

/** Menu photos (→ data URLs for the AI) and/or pasted text from the upload form */
export async function readImportForm(
  formData: FormData,
): Promise<{ ok: true; images: string[]; text: string } | { ok: false; error: ImportInputError }> {
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const text = String(formData.get("text") ?? "")
    .trim()
    .slice(0, MAX_TEXT);
  if ((files.length === 0 && !text) || files.length > MAX_IMAGES)
    return { ok: false, error: "invalid" };
  if (files.some((f) => !f.type.startsWith("image/") || f.size > MAX_IMAGE_BYTES)) {
    return { ok: false, error: "invalid" };
  }
  const tiles = (
    await Promise.all(files.map(async (f) => tilesOf(Buffer.from(await f.arrayBuffer()))))
  ).flat();
  return { ok: true, images: tiles.slice(0, MAX_TILES), text };
}

/**
 * One menu photo → a few overlapping crops (data URLs).
 * OpenAI scales every image so its SHORT side is ~768 px, so a whole tall page loses small
 * text. Cut into strips, each crop keeps far more readable pixels. Overlap (15 %) makes sure
 * no line is cut in half; the AI is told to list a dish seen in two crops only once.
 */
async function tilesOf(input: Buffer): Promise<string[]> {
  // rotate(): apply the phone's EXIF orientation so the text is upright
  const upright = await sharp(input).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(upright).metadata();
  if (!width || !height) return [];

  const crops: { left: number; top: number; width: number; height: number }[] = [];
  if (height > width * 1.3) {
    // Tall page → horizontal strips about as tall as the page is wide
    const count = Math.min(4, Math.ceil(height / (width * 0.9)));
    const strip = Math.ceil(height / count);
    const overlap = Math.round(strip * 0.15);
    for (let i = 0; i < count; i++) {
      const top = Math.max(0, i * strip - overlap);
      crops.push({ left: 0, top, width, height: Math.min(height - top, strip + overlap * 2) });
    }
  } else if (width > height * 1.3) {
    // Wide spread (two-column menu) → vertical halves
    const half = Math.ceil(width / 2);
    const overlap = Math.round(half * 0.1);
    const secondLeft = Math.max(0, half - overlap);
    crops.push({ left: 0, top: 0, width: Math.min(width, half + overlap), height });
    crops.push({ left: secondLeft, top: 0, width: width - secondLeft, height });
  } else {
    crops.push({ left: 0, top: 0, width, height });
  }

  return Promise.all(
    crops.map(async (c) => {
      const jpeg = await sharp(upright)
        .extract(c)
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    }),
  );
}
