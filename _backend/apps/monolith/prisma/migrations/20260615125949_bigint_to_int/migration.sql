/*
  Warnings:

  - You are about to alter the column `total_time_min` on the `components_mounted` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `health_index` on the `components_mounted` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `total_meters` on the `components_mounted` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `drivetrain_meters` on the `components_mounted` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `suspension_min` on the `components_mounted` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "components_mounted" ALTER COLUMN "total_time_min" SET DATA TYPE INTEGER,
ALTER COLUMN "health_index" SET DATA TYPE INTEGER,
ALTER COLUMN "total_meters" SET DATA TYPE INTEGER,
ALTER COLUMN "drivetrain_meters" SET DATA TYPE INTEGER,
ALTER COLUMN "suspension_min" SET DATA TYPE INTEGER;
