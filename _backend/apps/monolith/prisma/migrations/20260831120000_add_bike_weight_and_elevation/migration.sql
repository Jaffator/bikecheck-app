-- Two readings the bike detail page shows that the bike could not carry before.
--
-- bike_weight_kg is what the machine itself weighs, typed in by its owner. It is named for
-- the bike on purpose: users.weight_kg is the rider's weight and feeds the wear
-- calculation, and the two must never be read for one another. Decimal because a tenth of
-- a kilogram is exactly what an owner quotes about a road bike.
--
-- total_elevation_m accumulates from rides as they arrive, the way nothing else on this
-- table does. Deliberately not backfilled from the rides already recorded, so a bike
-- ridden before this existed reads lower than it has actually climbed.

ALTER TABLE "public"."bikes" ADD COLUMN "bike_weight_kg" DECIMAL(5,2);
ALTER TABLE "public"."bikes" ADD COLUMN "total_elevation_m" INTEGER;
