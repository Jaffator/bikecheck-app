/*
  Warnings:

  - You are about to drop the column `service_interval_h` on the `action_service_intervals` table. All the data in the column will be lost.
  - You are about to drop the column `bike_mileage_at_time` on the `event_actions_done` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "action_service_intervals" DROP COLUMN "service_interval_h",
ADD COLUMN     "service_interval_min" INTEGER;

-- AlterTable
ALTER TABLE "event_actions_done" DROP COLUMN "bike_mileage_at_time",
ADD COLUMN     "bike_km_at_time" INTEGER;
