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

// --- Bank transfer receipts: private bucket, owners see them through short-lived signed URLs ---

const RECEIPT_BUCKET = "payment-receipts";
const RECEIPT_MAX_SIZE = 3_000_000; // 3 MB — serverActions.bodySizeLimit (the client shrinks photos first)
const RECEIPT_URL_TTL = 60 * 60; // 1 hour

/** Creates the private bucket on first use (no manual Supabase setup needed) */
async function ensureReceiptBucket() {
  const { error } = await getSupabaseAdmin().storage.createBucket(RECEIPT_BUCKET, {
    public: false,
    fileSizeLimit: RECEIPT_MAX_SIZE,
    allowedMimeTypes: ["image/*"],
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

/** image/*, ≤ 3 MB. Path: stores/{storeId}/{orderId}/{random}.{ext}. Returns the storage path. */
export async function uploadReceipt(storeId: string, orderId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new MenuImageError("imageType");
  if (file.size > RECEIPT_MAX_SIZE) throw new MenuImageError("imageSize");

  const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const path = `stores/${storeId}/${orderId}/${crypto.randomUUID()}.${ext || "jpg"}`;

  const upload = () =>
    getSupabaseAdmin()
      .storage.from(RECEIPT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

  let { error } = await upload();
  if (error && /bucket not found/i.test(error.message)) {
    try {
      await ensureReceiptBucket();
      ({ error } = await upload());
    } catch (e) {
      error = e as typeof error;
    }
  }
  if (error) {
    reportError(error, "uploadReceipt");
    throw new MenuImageError("upload");
  }
  return path;
}

/** Old receipt removal (silent on error). Only inside this store's folder. */
export async function deleteReceipt(storeId: string, path: string | null | undefined) {
  if (!path || !path.startsWith(`stores/${storeId}/`)) return;
  const { error } = await getSupabaseAdmin().storage.from(RECEIPT_BUCKET).remove([path]);
  if (error) reportError(error, "deleteReceipt");
}

/** path -> signed URL (one request for the whole list). Missing ones are left out. */
export async function receiptUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(RECEIPT_BUCKET)
    .createSignedUrls(paths, RECEIPT_URL_TTL);
  if (error) {
    reportError(error, "receiptUrls");
    return urls;
  }
  for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  return urls;
}
