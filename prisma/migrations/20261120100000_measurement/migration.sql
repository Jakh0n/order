-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'MANUAL', 'OWNER_TEST');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "signupCampaign" TEXT,
ADD COLUMN     "signupMedium" TEXT,
ADD COLUMN     "signupReferrer" TEXT,
ADD COLUMN     "signupSource" TEXT;

-- Backfill: past orders placed with the store's own phone / WhatsApp number were the owner testing.
-- (Past manual orders can't be told apart and stay ONLINE.)
UPDATE "Order" o
SET "source" = 'OWNER_TEST'
FROM "Store" s
WHERE o."storeId" = s."id"
  AND length(regexp_replace(o."customerPhone", '\D', '', 'g')) >= 7
  AND regexp_replace(o."customerPhone", '\D', '', 'g') IN (
    regexp_replace(coalesce(s."phone", ''), '\D', '', 'g'),
    regexp_replace(coalesce(s."whatsappNumber", ''), '\D', '', 'g')
  );
