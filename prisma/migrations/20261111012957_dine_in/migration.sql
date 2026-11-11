-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'DINE_IN';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tableNumber" INTEGER;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "dineInEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tableCount" INTEGER NOT NULL DEFAULT 0;
