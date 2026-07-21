/*
  Warnings:

  - You are about to drop the column `wheel_size_id` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the `wheel_sizes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bikes" DROP CONSTRAINT "bikes_wheel_size_id_fkey";

-- DropIndex
DROP INDEX "bikes_wheel_size_id";

-- AlterTable
ALTER TABLE "bikes" DROP COLUMN "wheel_size_id",
ADD COLUMN     "wheel_size" VARCHAR;

-- DropTable
DROP TABLE "wheel_sizes";
