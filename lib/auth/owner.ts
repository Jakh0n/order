import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Joriy do'kon egasi va uning do'koni (hozircha bitta do'kon — ko'p filial keyin).
 * Bir so'rov ichida bir marta o'qiladi.
 */
export const getCurrentOwner = cache(async () => {
  const userId = await readSession();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      stores: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, slug: true, name: true },
      },
    },
  });
  const store = user?.stores[0];
  if (!user || !store) return null;

  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, store };
});

export type CurrentOwner = NonNullable<Awaited<ReturnType<typeof getCurrentOwner>>>;

/** Admin sahifalari va Server Action'lar uchun: kirmagan bo'lsa /admin/login ga. */
export async function requireOwner(): Promise<CurrentOwner> {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/admin/login");
  return owner;
}
