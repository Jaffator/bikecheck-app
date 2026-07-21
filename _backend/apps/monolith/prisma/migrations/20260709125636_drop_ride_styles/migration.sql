/*
  Warnings:

  - You are about to drop the column `ride_style_id` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the `ride_styles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bikes" DROP CONSTRAINT "bikes_ride_style_fkey";

-- AlterTable
ALTER TABLE "bikes" DROP COLUMN "ride_style_id";

-- DropTable
DROP TABLE "ride_styles";
