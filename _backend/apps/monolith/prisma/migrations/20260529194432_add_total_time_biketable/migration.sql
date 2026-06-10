/*
  Warnings:

  - You are about to drop the column `brake_load` on the `action_service_intervals` table. All the data in the column will be lost.
  - You are about to drop the column `mileage_km` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the column `brake_load` on the `components_mounted` table. All the data in the column will be lost.
  - Added the required column `brake_pad_wear_index_interval` to the `action_service_intervals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "action_service_intervals" DROP COLUMN "brake_load",
ADD COLUMN     "brake_pad_wear_index_interval" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "bikes" DROP COLUMN "mileage_km",
ADD COLUMN     "total_km" INTEGER,
ADD COLUMN     "total_time" INTEGER;

-- AlterTable
ALTER TABLE "components_mounted" DROP COLUMN "brake_load",
ADD COLUMN     "brake_pad_wear_index" INTEGER DEFAULT 0;
