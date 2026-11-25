-- The moment Pro started, empty without Pro. Not read from the Key: deleting one clears that link.
ALTER TABLE "users" ADD COLUMN "pro_since" TIMESTAMPTZ(6);

-- A Key gives Pro, which has no bike limit to grant.
ALTER TABLE "bike_keys" DROP COLUMN "bike_limit";
