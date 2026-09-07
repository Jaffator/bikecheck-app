-- A custom part type outlives the parts that use it (ADR 0021). A type nothing references is
-- deleted outright; one still naming parts is kept and marked deleted, so those parts go on
-- resolving their name, their history and their Replacement.
ALTER TABLE "public"."component_types" ADD COLUMN "is_deleted" BOOLEAN DEFAULT false;
ALTER TABLE "public"."component_types" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- One live row per name and owner, rather than one row per name ever used: a removed type
-- must not block the owner naming the same part again. Partial uniqueness is not something
-- Prisma can express in the schema, so the index is written by hand and keeps its name.
DROP INDEX "public"."component_types_component_type_user_id_key";

CREATE UNIQUE INDEX "component_types_component_type_user_id_key"
  ON "public"."component_types"("component_type" ASC, "user_id" ASC)
  WHERE "is_deleted" IS NOT TRUE;
