-- A user can add a tag of their own to a catalogue action. Ownership follows the pattern
-- already used by component_types and events_action: a nullable user_id, where null means
-- the row was seeded and belongs to everyone.

ALTER TABLE "public"."event_action_tags" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "public"."event_action_tags"
  ADD CONSTRAINT "event_action_tags_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Two users may each name a tag "Bearing check" on the same action, so the tag name is
-- only unique per owner now.
DROP INDEX "public"."event_action_tags_event_action_id_event_action_tag_key";

CREATE UNIQUE INDEX "event_action_tags_event_action_id_event_action_tag_user_id_key"
  ON "public"."event_action_tags" ("event_action_id", "event_action_tag", "user_id");

-- Postgres counts NULLs as distinct, so the index above would let the seeder insert the
-- same seeded tag twice. This restores the guarantee it relies on for skipDuplicates.
CREATE UNIQUE INDEX "event_action_tags_seeded_key"
  ON "public"."event_action_tags" ("event_action_id", "event_action_tag")
  WHERE "user_id" IS NULL;
