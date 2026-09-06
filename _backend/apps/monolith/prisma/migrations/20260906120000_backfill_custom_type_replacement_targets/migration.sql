-- Every owner-created Component Type gets its category's catch-all Replacement, so Replace
-- is offered on it like on a seeded one (ADR 0018). Types created from now on get the row
-- on the create path; this covers the ones named before that shipped.
--
-- The catch-all is found through the types it already targets, not by templating the
-- category name: two categories name theirs differently from themselves (Saddle &
-- Seatpost, E-bike). ON CONFLICT makes a re-run harmless.
INSERT INTO event_action_targets (event_action_id, component_type_id)
SELECT catch_all.id, custom.id
FROM component_types AS custom
CROSS JOIN LATERAL (
  SELECT action.id
  FROM events_action AS action
  WHERE action.replace_action = TRUE
    AND action.user_id IS NULL
    AND action.action_name LIKE '%Part Replacement'
    AND EXISTS (
      SELECT 1
      FROM event_action_targets AS seeded_target
      JOIN component_types AS seeded_type ON seeded_type.id = seeded_target.component_type_id
      WHERE seeded_target.event_action_id = action.id
        AND seeded_type.component_group_id = custom.component_group_id
    )
    -- And nothing outside it: a catch-all is one row per category (ADR 0017), so an
    -- Action reaching into a second group is not this category's.
    AND NOT EXISTS (
      SELECT 1
      FROM event_action_targets AS other_target
      JOIN component_types AS other_type ON other_type.id = other_target.component_type_id
      WHERE other_target.event_action_id = action.id
        AND other_type.component_group_id <> custom.component_group_id
    )
  ORDER BY action.id
  LIMIT 1
) AS catch_all
WHERE custom.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_action_targets AS existing WHERE existing.component_type_id = custom.id
  )
ON CONFLICT (event_action_id, component_type_id) DO NOTHING;
