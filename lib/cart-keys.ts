// Server va klientda ishlatiladi ("use client" faylda bo'lishi mumkin emas).

/** Admin "qo'lda buyurtma" savati mijoz savatidan alohida */
export function adminCartKey(slug: string) {
  return `admin:${slug}`;
}
