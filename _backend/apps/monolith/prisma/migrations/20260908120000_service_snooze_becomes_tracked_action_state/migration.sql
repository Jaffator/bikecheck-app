-- service_snooze becomes the state of a Tracked Action (ADR 0027). It was keyed by the bike
-- and the action, which cannot tell a bike's two tyres apart and would let an Extension
-- outlive the part it was granted on. It is rekeyed to the part and the action instead.
-- The table is referenced by no code and holds no rows, so nothing is carried across.
DELETE FROM "public"."service_snooze";

ALTER TABLE "public"."service_snooze" DROP CONSTRAINT "service_snooze_bike_id_fkey";
ALTER TABLE "public"."service_snooze" DROP CONSTRAINT "service_snooze_event_action_id_fkey";
DROP INDEX "public"."service_snooze_bike_id_event_action_id_key";

ALTER TABLE "public"."service_snooze" DROP COLUMN "bike_id";
ALTER TABLE "public"."service_snooze" RENAME COLUMN "event_action_id" TO "event_actions_id";
ALTER TABLE "public"."service_snooze" ADD COLUMN "component_mounted_id" INTEGER NOT NULL;

-- The highest threshold the owner has already been told about, and when. Kept as the number
-- rather than a symbol, so moving a threshold needs no migration (ADR 0026).
ALTER TABLE "public"."service_snooze" ADD COLUMN "reached_threshold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."service_snooze" ADD COLUMN "announced_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "service_snooze_component_mounted_id_event_actions_id_key"
  ON "public"."service_snooze"("component_mounted_id", "event_actions_id");

-- The state goes with the part through the existing cascade, so there is no cleanup code.
ALTER TABLE "public"."service_snooze"
  ADD CONSTRAINT "service_snooze_component_mounted_id_fkey"
  FOREIGN KEY ("component_mounted_id") REFERENCES "public"."components_mounted"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."service_snooze"
  ADD CONSTRAINT "service_snooze_event_actions_id_fkey"
  FOREIGN KEY ("event_actions_id") REFERENCES "public"."events_action"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
