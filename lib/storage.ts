import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "menu-images";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function uploadMenuImage(storeId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Faqat rasm yuklash mumkin");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Rasm hajmi 2 MB dan oshmasligi kerak");
  }

  const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `stores/${storeId}/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Rasm yuklanmadi: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
