-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "cornerStyle" TEXT NOT NULL DEFAULT 'soft',
ADD COLUMN     "fontStyle" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "headerStyle" TEXT NOT NULL DEFAULT 'cover',
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "showDescriptions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showSearch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telegramChannel" TEXT,
ADD COLUMN     "tiktok" TEXT;
