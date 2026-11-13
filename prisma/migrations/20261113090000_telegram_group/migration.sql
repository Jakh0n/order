-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramChatTitle" TEXT,
ADD COLUMN     "telegramLinkToken" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "telegramMessageId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Store_telegramLinkToken_key" ON "Store"("telegramLinkToken");
