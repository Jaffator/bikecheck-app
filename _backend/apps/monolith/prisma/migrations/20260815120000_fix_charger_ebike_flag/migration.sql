-- Charger was seeded with ebike = false, so it showed up in the component list
-- of every non-electric bike. It only exists for e-bikes, like the rest of its
-- group. Data-only fix; the seed scripts carry the same correction.
UPDATE "component_types"
SET "ebike" = true
WHERE "component_type" = 'Charger';
