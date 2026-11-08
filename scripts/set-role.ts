// Foydalanish: npm run user:role -- <email> SUPERADMIN|OWNER
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = process.argv[3]?.trim().toUpperCase();
  if (!email || (role !== "SUPERADMIN" && role !== "OWNER")) {
    console.error("Foydalanish: npm run user:role -- <email> SUPERADMIN|OWNER");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({ where: { email }, data: { role } }).catch(() => null);
    if (!user) {
      console.error(`Foydalanuvchi topilmadi: ${email}`);
      process.exit(1);
    }
    console.log(`${email}: ${role}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
