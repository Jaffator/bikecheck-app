/*
  Warnings:

  - You are about to drop the `action_service_intervals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "action_service_intervals" DROP CONSTRAINT "action_service_intervals_event_actions_id_fkey";

-- DropTable
DROP TABLE "action_service_intervals";

-- CreateTable
CREATE TABLE "default_service_intervals" (
    "id" SERIAL NOT NULL,
    "service_interval_km" INTEGER,
    "event_actions_id" INTEGER NOT NULL,
    "health_index_interval" INTEGER,
    "service_interval_min" INTEGER,
    "category" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "component_service_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_service_intervals_event_actions_id_service_interval_key" ON "default_service_intervals"("event_actions_id", "service_interval_km", "service_interval_min", "health_index_interval");

-- AddForeignKey
ALTER TABLE "default_service_intervals" ADD CONSTRAINT "default_service_intervals_event_actions_id_fkey" FOREIGN KEY ("event_actions_id") REFERENCES "events_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
