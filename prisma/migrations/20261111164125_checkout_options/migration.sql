-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "tip" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "checkoutEmail" TEXT NOT NULL DEFAULT 'off',
ADD COLUMN     "checkoutNote" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "checkoutPromo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tipsEnabled" BOOLEAN NOT NULL DEFAULT false;
