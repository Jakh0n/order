import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { reportError } from "@/lib/report-error";

const BUCKET = "menu-images";
const MAX_SIZE = 2_000_000; // 2 MB — Supabase bucket cheklovi bilan bir xil (fileSizeLimit "2MB")

export type UploadError = "imageType" | "imageSize" | "upload";

export class MenuImageError extends Error {
  constructor(public code: UploadError) {
    super(code);
  }
}

/** Shu do'kon rasmlari uchun public URL prefiksi */
export function menuImagePrefix(storeId: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${BUCKET}/stores/${storeId}/` : null;
}

/** Faqat image/*, ≤ 2 MB. Yo'l: stores/{storeId}/{random}.{ext}. Public URL qaytaradi. */
export async function uploadMenuImage(storeId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new MenuImageError("imageType");
  if (file.size > MAX_SIZE) throw new MenuImageError("imageSize");

  const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const path = `stores/${storeId}/${crypto.randomUUID()}.${ext || "jpg"}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    reportError(error, "uploadMenuImage");
    throw new MenuImageError("upload");
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Eski rasmni o'chirish (xato bo'lsa jim — asosiy amalni to'xtatmaydi). Faqat shu do'kon papkasidan. */
export async function deleteMenuImage(storeId: string, url: string | null | undefined) {
  const prefix = menuImagePrefix(storeId);
  if (!url || !prefix || !url.startsWith(prefix)) return;

  const path = `stores/${storeId}/${url.slice(prefix.length)}`;
  const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path]);
  if (error) reportError(error, "deleteMenuImage");
}
