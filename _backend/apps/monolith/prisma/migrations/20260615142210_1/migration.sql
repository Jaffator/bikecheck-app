/*
  Warnings:

  - You are about to drop the column `service_interval_meters` on the `action_service_intervals` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[event_actions_id,service_interval_km,service_interval_min,health_index_interval]` on the table `action_service_intervals` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "action_service_intervals_event_actions_id_service_interval__key";

-- AlterTable
ALTER TABLE "action_service_intervals" DROP COLUMN "service_interval_meters",
ADD COLUMN     "service_interval_km" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "action_service_intervals_event_actions_id_service_interval__key" ON "action_service_intervals"("event_actions_id", "service_interval_km", "service_interval_min", "health_index_interval");
