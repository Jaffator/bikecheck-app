-- CreateTable
CREATE TABLE "service_snooze" (
    "id" SERIAL NOT NULL,
    "event_action_id" INTEGER NOT NULL,
    "bike_id" INTEGER NOT NULL,
    "extended_by_km" INTEGER DEFAULT 0,
    "extended_by_min" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_snooze_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_snooze_bike_id_event_action_id_key" ON "service_snooze"("bike_id", "event_action_id");

-- AddForeignKey
ALTER TABLE "service_snooze" ADD CONSTRAINT "service_snooze_event_action_id_fkey" FOREIGN KEY ("event_action_id") REFERENCES "events_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_snooze" ADD CONSTRAINT "service_snooze_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
