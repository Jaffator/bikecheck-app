-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "dedup_key" VARCHAR,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strava_pending_activities" (
    "id" SERIAL NOT NULL,
    "activity_id" BIGINT NOT NULL,
    "athlete_id" VARCHAR NOT NULL,
    "gear_id" VARCHAR NOT NULL,
    "analyzed_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "strava_pending_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_unread" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedup_key_key" ON "notifications"("user_id", "dedup_key");

-- CreateIndex
CREATE UNIQUE INDEX "strava_pending_activities_activity_id_key" ON "strava_pending_activities"("activity_id");

-- CreateIndex
CREATE INDEX "strava_pending_gear_athlete" ON "strava_pending_activities"("gear_id", "athlete_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
