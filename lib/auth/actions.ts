"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { homePathFor } from "@/lib/auth/owner";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export type LoginState = { error?: "invalid"; email?: string } | undefined;

// Foydalanuvchi yo'q bo'lsa ham vaqt bir xil bo'lishi uchun
let dummyHash: Promise<string> | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").slice(0, 200);
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  // React 19 xatodan keyin formani tozalaydi — email'ni qaytarib beramiz
  if (!parsed.success) return { error: "invalid", email };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, role: true, _count: { select: { stores: true } } },
  });

  dummyHash ??= hashPassword("dummy-password-for-timing");
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await dummyHash));
  if (!user?.passwordHash || !ok) return { error: "invalid", email };

  await createSession(user.id);
  redirect(homePathFor(user.role, user._count.stores > 0));
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
