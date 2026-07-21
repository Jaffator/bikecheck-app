/*
  Warnings:

  - You are about to drop the column `bike_size_id` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the `bike_sizes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bikes" DROP CONSTRAINT "bikes_bike_size_id_fkey";

-- DropIndex
DROP INDEX "bikes_bike_size_col";

-- AlterTable
ALTER TABLE "bikes" DROP COLUMN "bike_size_id",
ADD COLUMN     "bike_size" VARCHAR;

-- AlterTable
ALTER TABLE "default_service_intervals" RENAME CONSTRAINT "component_service_intervals_pkey" TO "default_service_intervals_pkey";

-- DropTable
DROP TABLE "bike_sizes";
