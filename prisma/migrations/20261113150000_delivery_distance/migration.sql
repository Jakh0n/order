-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "deliveryByDistance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryTiers" JSONB,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
