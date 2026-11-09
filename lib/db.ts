import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Bog'langan ma'lumotlarni (include/nested select) bitta JOIN so'rovida o'qish.
 * Prisma standart holatda har bir bog'lanish uchun alohida so'rov yuboradi — bazaga har borish
 * vaqt oladi, shuning uchun nested o'qishlarda `...JOIN` ishlating.
 */
export const JOIN = { relationLoadStrategy: "join" } as const;
