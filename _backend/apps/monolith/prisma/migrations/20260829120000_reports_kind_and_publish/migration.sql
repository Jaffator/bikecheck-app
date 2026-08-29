-- A Report is one of three documents, and being made is not the same as being published.
--
-- `kind` says which document the public page must lay out. `is_public` sits alongside
-- `revoked` rather than replacing it, because a Report has three states and one flag
-- cannot carry both meanings (ADR 0011): made but closed, published and open, revoked
-- and closed for good.
--
-- Every row here predates version 2 of the snapshot and so cannot say which kind it is.
-- No link has ever been published, so the rows are dropped rather than guessed at - which
-- also leaves the table empty for a NOT NULL `kind` with no invented default.

CREATE TYPE "public"."report_kind" AS ENUM ('SERVICE', 'PERIOD', 'BIKECHECK');

DELETE FROM "public"."reports";

ALTER TABLE "public"."reports" ADD COLUMN "kind" "public"."report_kind" NOT NULL;
ALTER TABLE "public"."reports" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
