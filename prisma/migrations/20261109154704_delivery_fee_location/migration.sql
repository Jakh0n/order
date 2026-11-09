-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "deliveryFee" INTEGER NOT NULL DEFAULT 0;

-- Carry over the cheapest existing area fee as the store's flat delivery fee
UPDATE "Store" s
SET "deliveryFee" = z.min_fee
FROM (SELECT "storeId", MIN("fee") AS min_fee FROM "DeliveryZone" GROUP BY "storeId") z
WHERE z."storeId" = s."id";
