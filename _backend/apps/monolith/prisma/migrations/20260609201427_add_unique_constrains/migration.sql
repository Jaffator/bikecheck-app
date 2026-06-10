/*
  Warnings:

  - A unique constraint covering the columns `[event_actions_id,service_interval_meters,service_interval_min,health_index_interval]` on the table `action_service_intervals` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "action_service_intervals_event_actions_id_service_interval__key" ON "action_service_intervals"("event_actions_id", "service_interval_meters", "service_interval_min", "health_index_interval");
