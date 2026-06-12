/*
  Warnings:

  - You are about to drop the column `effective_meters` on the `components_mounted` table. All the data in the column will be lost.
  - You are about to drop the column `effective_time_min` on the `components_mounted` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "components_mounted" DROP COLUMN "effective_meters",
DROP COLUMN "effective_time_min",
ADD COLUMN     "drivetrain_meters" BIGINT DEFAULT 0,
ADD COLUMN     "suspension_min" BIGINT DEFAULT 0;
