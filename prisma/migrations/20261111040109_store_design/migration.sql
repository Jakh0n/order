-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "announcement" TEXT,
ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "menuLayout" TEXT NOT NULL DEFAULT 'list',
ADD COLUMN     "pageBackground" TEXT NOT NULL DEFAULT 'gray';
