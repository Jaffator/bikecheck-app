-- A part every bike carries is saved even when the user leaves its description
-- blank, so wear tracking starts on day one. Optional parts (dropper, bashguard,
-- inserts…) are only saved once described, which keeps a road bike's list clean.
ALTER TABLE "component_types" ADD COLUMN "essential" BOOLEAN NOT NULL DEFAULT false;

-- Existing rows carry the same verdict the seed scripts now hold. Keyed by name
-- because ids are reassigned on every reseed.
UPDATE "component_types"
SET "essential" = true
WHERE "component_type" IN (
  'Frame',
  'Fork',
  'Shock',
  'Headset',
  'Stem',
  'Handlebar',
  'Grips',
  'Saddle',
  'Seatpost',
  'Rim',
  'Tire',
  'Hub',
  'Crank',
  'Chainring',
  'Cassette',
  'Chain',
  'Bottom Bracket',
  'Derailleur',
  'Shifter',
  'Brake Caliper',
  'Brake Lever',
  'Brake Rotor',
  'Brake pad',
  'Pedals'
);
