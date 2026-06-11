/*
  Warnings:

  - You are about to drop the column `effective_km` on the `components_mounted` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "components_mounted" DROP COLUMN "effective_km",
ADD COLUMN     "effective_meters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "effective_time_min" INTEGER NOT NULL DEFAULT 0;
