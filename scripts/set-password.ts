// Foydalanish: npm run user:password -- owner@order.uz
// Parol so'raladi (kamida 8 belgi) va foydalanuvchiga xeshlab saqlanadi.
import { createInterface } from "node:readline/promises";

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Foydalanish: npm run user:password -- <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`Foydalanuvchi topilmadi: ${email}`);
      process.exit(1);
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const password = await rl.question("Yangi parol (kamida 8 belgi): ");
    rl.close();
    if (password.length < 8) {
      console.error("Parol juda qisqa");
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
    console.log(`Parol saqlandi: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
