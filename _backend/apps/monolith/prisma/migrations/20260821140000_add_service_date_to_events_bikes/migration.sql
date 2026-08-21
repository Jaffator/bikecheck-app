-- A service is recorded when the user gets around to it, which is often days or
-- months after the work happened. created_at answers "when was this written down";
-- it cannot also answer "when was this done" without losing one of the two.
ALTER TABLE "events_bikes" ADD COLUMN "service_date" TIMESTAMPTZ(6);

-- Existing rows were entered as they happened, so the two dates coincide.
UPDATE "events_bikes" SET "service_date" = "created_at" WHERE "service_date" IS NULL;

-- The service history is listed newest-first by this column.
CREATE INDEX "events_bikes_service_date" ON "events_bikes"("service_date");
