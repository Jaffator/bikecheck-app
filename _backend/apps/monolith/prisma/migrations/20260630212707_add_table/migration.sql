-- CreateTable
CREATE TABLE "bike_service_interval" (
    "id" SERIAL NOT NULL,
    "bike_id" INTEGER NOT NULL,
    "event_actions_id" INTEGER NOT NULL,
    "service_interval_km" INTEGER,
    "service_interval_min" INTEGER,
    "health_index_interval" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "bike_service_interval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bike_service_interval_bike_id_idx" ON "bike_service_interval"("bike_id");

-- CreateIndex
CREATE UNIQUE INDEX "bike_service_interval_bike_id_event_actions_id_key" ON "bike_service_interval"("bike_id", "event_actions_id");

-- AddForeignKey
ALTER TABLE "bike_service_interval" ADD CONSTRAINT "bike_service_interval_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_service_interval" ADD CONSTRAINT "bike_service_interval_event_actions_id_fkey" FOREIGN KEY ("event_actions_id") REFERENCES "events_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
