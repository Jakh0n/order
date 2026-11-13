-- The staff Telegram group bot was reverted before release; a preview deploy had already added
-- its columns. No shipped code ever wrote to them. Remove them so the schema matches the code.

-- DropIndex
DROP INDEX IF EXISTS "Store_telegramLinkToken_key";

-- AlterTable
ALTER TABLE "Store" DROP COLUMN IF EXISTS "telegramChatId",
DROP COLUMN IF EXISTS "telegramChatTitle",
DROP COLUMN IF EXISTS "telegramLinkToken";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN IF EXISTS "telegramMessageId";
