import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { readSession } from "@/lib/auth/session";
import { JOIN, prisma } from "@/lib/db";

/** Joriy foydalanuvchi va (bo'lsa) birinchi do'koni. Bir so'rov ichida bir marta o'qiladi. */
export const getCurrentUser = cache(async () => {
  const userId = await readSession();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    ...JOIN,
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      // Hozircha bitta do'kon — ko'p filial keyin
      stores: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          slug: true,
          name: true,
          isBlocked: true,
          currency: true,
          timeZone: true,
        },
      },
    },
  });
  if (!user) return null;

  const { stores, ...rest } = user;
  return { user: rest, store: stores[0] ?? null };
});

/** Joriy do'kon egasi va uning do'koni (do'koni yo'q foydalanuvchi uchun null) */
export const getCurrentOwner = cache(async () => {
  const current = await getCurrentUser();
  if (!current?.store) return null;
  return { user: current.user, store: current.store };
});

export type CurrentOwner = NonNullable<Awaited<ReturnType<typeof getCurrentOwner>>>;

/** Admin sahifalari va Server Action'lar uchun: kirmagan bo'lsa /admin/login ga. */
export async function requireOwner(): Promise<CurrentOwner> {
  const owner = await getCurrentOwner();
  if (!owner) {
    // Do'konsiz superadmin admin paneliga emas, o'z paneliga
    const current = await getCurrentUser();
    redirect(current?.user.role === "SUPERADMIN" ? "/superadmin" : "/admin/login");
  }
  return owner;
}

/** Superadmin sahifalari va action'lari uchun. Boshqa rollar uchun 404 (panel borligini oshkor qilmaymiz). */
export async function requireSuperadmin() {
  const current = await getCurrentUser();
  if (!current) redirect("/admin/login");
  if (current.user.role !== "SUPERADMIN") {
    notFound();
  }
  return current.user;
}

/** Kirgandan keyingi bosh sahifa */
export function homePathFor(role: string, hasStore: boolean) {
  if (role === "SUPERADMIN" && !hasStore) return "/superadmin";
  return "/admin/orders";
}
