import "server-only";

export const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // after the browser shrinks them
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
  const images = await Promise.all(
    files.map(
      async (f) => `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`,
    ),
  );
  return { ok: true, images, text };
}
