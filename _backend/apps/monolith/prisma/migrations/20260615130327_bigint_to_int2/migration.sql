/*
  Warnings:

  - You are about to drop the column `drivetrain_meters` on the `components_mounted` table. All the data in the column will be lost.
  - You are about to drop the column `total_meters` on the `components_mounted` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bike_components_mileage";

-- AlterTable
ALTER TABLE "components_mounted" DROP COLUMN "drivetrain_meters",
DROP COLUMN "total_meters",
ADD COLUMN     "drivetrain_km" INTEGER DEFAULT 0,
ADD COLUMN     "total_km" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "bike_components_mileage" ON "components_mounted"("total_km");
