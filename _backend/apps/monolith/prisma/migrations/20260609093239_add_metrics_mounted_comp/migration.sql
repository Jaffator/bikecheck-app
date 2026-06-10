/*
  Warnings:

  - Made the column `total_time_min` on table `components_mounted` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "components_mounted" ADD COLUMN     "effective_km" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "total_km" SET DEFAULT 0,
ALTER COLUMN "total_time_min" SET NOT NULL,
ALTER COLUMN "health_index" SET DEFAULT 0;
