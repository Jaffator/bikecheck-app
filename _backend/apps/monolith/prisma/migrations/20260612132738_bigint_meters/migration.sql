/*
  Warnings:

  - You are about to drop the column `total_km` on the `components_mounted` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bike_components_mileage";

-- AlterTable
ALTER TABLE "components_mounted" DROP COLUMN "total_km",
ADD COLUMN     "total_meters" BIGINT DEFAULT 0,
ALTER COLUMN "total_time_min" SET DATA TYPE BIGINT,
ALTER COLUMN "health_index" SET DATA TYPE BIGINT,
ALTER COLUMN "effective_meters" SET DATA TYPE BIGINT,
ALTER COLUMN "effective_time_min" DROP NOT NULL,
ALTER COLUMN "effective_time_min" SET DATA TYPE BIGINT;

-- CreateIndex
CREATE INDEX "bike_components_mileage" ON "components_mounted"("total_meters");
