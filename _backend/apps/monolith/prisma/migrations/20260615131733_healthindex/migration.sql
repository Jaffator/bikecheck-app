/*
  Warnings:

  - You are about to drop the column `braking_load_score` on the `rides` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rides" DROP COLUMN "braking_load_score",
ADD COLUMN     "health_index_brake_pad" INTEGER;
