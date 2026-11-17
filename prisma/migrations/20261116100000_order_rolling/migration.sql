-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "extraTelegramUsernames" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "extraWhatsappNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sentTo" TEXT;

