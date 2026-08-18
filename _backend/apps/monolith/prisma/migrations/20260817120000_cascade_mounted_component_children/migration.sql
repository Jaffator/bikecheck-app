-- Deleting a bike cascades to its mounted components, but the three tables that
-- hang off a mounted component were ON DELETE NO ACTION, so any bike with a
-- recorded service, suspension setup or tire setup could not be deleted at all.
-- All three hold data about the mounted component itself, so they belong with it.

-- AlterTable: action_done_component_map -> components_mounted
ALTER TABLE "public"."action_done_component_map"
  DROP CONSTRAINT "action_done_component_map_component_mounted_id_fkey";

ALTER TABLE "public"."action_done_component_map"
  ADD CONSTRAINT "action_done_component_map_component_mounted_id_fkey"
  FOREIGN KEY ("component_mounted_id") REFERENCES "public"."components_mounted"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- AlterTable: suspension_setup -> components_mounted
ALTER TABLE "public"."suspension_setup"
  DROP CONSTRAINT "suspension_setup_mounted_component_id_fkey";

ALTER TABLE "public"."suspension_setup"
  ADD CONSTRAINT "suspension_setup_mounted_component_id_fkey"
  FOREIGN KEY ("mounted_component_id") REFERENCES "public"."components_mounted"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- AlterTable: tire_setup -> components_mounted
ALTER TABLE "public"."tire_setup"
  DROP CONSTRAINT "tire_setup_component_mounted_id_fkey";

ALTER TABLE "public"."tire_setup"
  ADD CONSTRAINT "tire_setup_component_mounted_id_fkey"
  FOREIGN KEY ("component_mounted_id") REFERENCES "public"."components_mounted"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
