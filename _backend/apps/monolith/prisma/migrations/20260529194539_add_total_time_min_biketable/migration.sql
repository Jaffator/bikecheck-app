/*
  Warnings:

  - You are about to drop the column `total_time` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the column `total_minutes` on the `components_mounted` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bikes" DROP COLUMN "total_time",
ADD COLUMN     "total_time_min" INTEGER;

-- AlterTable
ALTER TABLE "components_mounted" DROP COLUMN "total_minutes",
ADD COLUMN     "total_time_min" INTEGER DEFAULT 0;
