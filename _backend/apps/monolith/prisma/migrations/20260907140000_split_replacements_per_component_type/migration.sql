-- One Replacement per Component Type (ADR 0022).
--
-- ADR 0017 rejected a named Replacement per type because the wizard's action step would
-- carry ten of them in Drivetrain. The step is filtered to what the bike actually has
-- mounted, so the real number is seven, and the picker inside each catch-all row cost the
-- owner a choice the app already knew the answer to.
--
-- What this delivers:
--   1. `events_action.component_group_id`, so a catch-all keeps its category once it has
--      no targets left to derive it from.
--   2. Thirty new Replacements, one per seeded Component Type that lacked its own.
--   3. Four actions demoted from Replacement to ordinary work: they replace a sub-part
--      that is not a tracked Component Type, and firing ADR 0003 for them ended a part
--      that never left the bike.
--   4. The catch-alls stripped of their seeded targets. They survive for owner-created
--      types alone (ADR 0022), which is what the new column is for.
--   5. Past replacements repointed at the Replacement that names their part.
--
-- Idempotent: re-running inserts and moves nothing.

-- ---------------------------------------------------------------------------
-- 1. A catch-all's category, stored rather than derived
-- ---------------------------------------------------------------------------
-- Set on the nine catch-alls only. Every other Action still answers "which category?"
-- through its targets; a catch-all is the one row that ends up with none.
ALTER TABLE "events_action" ADD COLUMN IF NOT EXISTS "component_group_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_action_component_group_id_fkey'
  ) THEN
    ALTER TABLE "events_action"
      ADD CONSTRAINT "events_action_component_group_id_fkey"
      FOREIGN KEY ("component_group_id") REFERENCES "component_groups"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "events_action_component_group_id_idx"
  ON "events_action"("component_group_id");

-- Read off the targets while they are still there. A catch-all targets one category by
-- construction (ADR 0017), so a single group per action is the expected shape.
UPDATE events_action AS a
SET component_group_id = sub.group_id
FROM (
  SELECT
    t.event_action_id,
    MIN(ct.component_group_id) AS group_id,
    COUNT(DISTINCT ct.component_group_id) AS group_count
  FROM event_action_targets AS t
  JOIN component_types AS ct ON ct.id = t.component_type_id
  GROUP BY t.event_action_id
) AS sub
WHERE sub.event_action_id = a.id
  AND sub.group_count = 1
  AND a.user_id IS NULL
  AND a.replace_action
  AND a.action_name LIKE '%Part Replacement'
  AND a.component_group_id IS NULL;

-- A catch-all that kept no category would leave the next owner-created type in it with no
-- Replacement at all, which is the one job the catch-alls still have.
DO $$
DECLARE
  orphan TEXT;
BEGIN
  SELECT string_agg(action_name, ', ') INTO orphan
  FROM events_action
  WHERE user_id IS NULL
    AND replace_action
    AND action_name LIKE '%Part Replacement'
    AND component_group_id IS NULL;

  IF orphan IS NOT NULL THEN
    RAISE EXCEPTION
      'Catch-all Replacement(s) % have no component_group_id; owner-created types in that category would get no Replacement (ADR 0022).',
      orphan;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. One Replacement per seeded Component Type
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  -- [component_type, action_name, i18n_key]. Keyed by type name, because ids differ
  -- between environments. The key is toI18nKey('action', action_name), derived at seed
  -- time and hardcoded here, so a rename is one edit in each place.
  --
  -- The eight types already carrying a 1:1 Replacement are absent: Chain, Cassette,
  -- Chainring, Brake pad, Brake Lever, Tire, Grips and Sealant.
  new_actions CONSTANT jsonb := jsonb_build_array(
    -- Suspension
    jsonb_build_array('Fork',           'Fork Replacement',           'action.forkReplacement'),
    jsonb_build_array('Shock',          'Shock Replacement',          'action.shockReplacement'),
    -- Frame
    jsonb_build_array('Frame',          'Frame Replacement',          'action.frameReplacement'),
    -- 'Hanger Replacement' is already in the catalogue, flagged as ordinary work. It is
    -- promoted rather than duplicated: a hanger is a tracked type and swapping one really
    -- does end a Mounted Component.
    jsonb_build_array('Hanger',         'Hanger Replacement',         'action.hangerReplacement'),
    -- Cockpit. Headset arrives here because Headset Bearing Replacement is demoted below.
    jsonb_build_array('Headset',        'Headset Replacement',        'action.headsetReplacement'),
    jsonb_build_array('Stem',           'Stem Replacement',           'action.stemReplacement'),
    jsonb_build_array('Handlebar',      'Handlebar Replacement',      'action.handlebarReplacement'),
    jsonb_build_array('Dropper Lever',  'Dropper Lever Replacement',  'action.dropperLeverReplacement'),
    jsonb_build_array('Remote Lever',   'Remote Lever Replacement',   'action.remoteLeverReplacement'),
    -- Saddle & Seatpost
    jsonb_build_array('Saddle',         'Saddle Replacement',         'action.saddleReplacement'),
    jsonb_build_array('Seatpost',       'Seatpost Replacement',       'action.seatpostReplacement'),
    -- Wheels. Hub arrives here because Hub Bearing Replacement is demoted below.
    jsonb_build_array('Rim',            'Rim Replacement',            'action.rimReplacement'),
    jsonb_build_array('Hub',            'Hub Replacement',            'action.hubReplacement'),
    jsonb_build_array('Axle',           'Axle Replacement',           'action.axleReplacement'),
    jsonb_build_array('Inserts',        'Inserts Replacement',        'action.insertsReplacement'),
    jsonb_build_array('Valves',         'Valves Replacement',         'action.valvesReplacement'),
    -- Drivetrain. Derailleur and Shifter arrive here because Battery Swap is demoted
    -- below; until now an AXS battery swap was their only Replacement.
    jsonb_build_array('Derailleur',     'Derailleur Replacement',     'action.derailleurReplacement'),
    jsonb_build_array('Shifter',        'Shifter Replacement',        'action.shifterReplacement'),
    jsonb_build_array('Crank',          'Crank Replacement',          'action.crankReplacement'),
    jsonb_build_array('Bashguard',      'Bashguard Replacement',      'action.bashguardReplacement'),
    jsonb_build_array('Chain Guide',    'Chain Guide Replacement',    'action.chainGuideReplacement'),
    jsonb_build_array('Bottom Bracket', 'Bottom Bracket Replacement', 'action.bottomBracketReplacement'),
    -- Brakes. Brake Caliper arrives here because Brake Hose Replacement is demoted below.
    jsonb_build_array('Brake Caliper',  'Brake Caliper Replacement',  'action.brakeCaliperReplacement'),
    jsonb_build_array('Brake Rotor',    'Brake Rotor Replacement',    'action.brakeRotorReplacement'),
    -- E-bike
    jsonb_build_array('Motor',          'Motor Replacement',          'action.motorReplacement'),
    jsonb_build_array('Battery',        'Battery Replacement',        'action.batteryReplacement'),
    jsonb_build_array('Display',        'Display Replacement',        'action.displayReplacement'),
    jsonb_build_array('Charger',        'Charger Replacement',        'action.chargerReplacement'),
    jsonb_build_array('E-Bike System',  'E-Bike System Replacement',  'action.eBikeSystemReplacement'),
    -- Other
    jsonb_build_array('Pedals',         'Pedals Replacement',         'action.pedalsReplacement')
  );
  rec jsonb;
  type_id INT;
  action_id INT;
  action_owner INT;
BEGIN
  -- A database migrated before its catalogue is seeded has nothing to split, and must not
  -- be stopped for it. A type missing from a catalogue that *is* seeded is real drift and
  -- still raises below.
  IF NOT EXISTS (SELECT 1 FROM component_types WHERE user_id IS NULL) THEN
    RETURN;
  END IF;

  -- 'Remote Lever' is a known drift (ADR 0019): seeded in seed_type_components.ts but
  -- never inserted by a migration, so no deployed database carries it.
  IF NOT EXISTS (
    SELECT 1 FROM component_types WHERE component_type = 'Remote Lever' AND user_id IS NULL
  ) THEN
    INSERT INTO component_types (component_type, i18n_key, ebike, essential, component_group_id, has_position)
    SELECT 'Remote Lever', 'component.remoteLever', FALSE, FALSE, id, FALSE
    FROM component_groups WHERE group_name = 'Cockpit';
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(new_actions) LOOP
    -- Reset: SELECT INTO leaves the previous iteration's values when it finds no row.
    type_id := NULL;
    action_id := NULL;
    action_owner := NULL;

    -- Seeded types only. An owner may have named a type 'Fork' of their own, and that one
    -- belongs to the catch-all (ADR 0022).
    SELECT id INTO type_id
    FROM component_types
    WHERE component_type = rec ->> 0
      AND user_id IS NULL
      AND is_deleted IS NOT TRUE;

    IF type_id IS NULL THEN
      RAISE EXCEPTION
        'Component Type "%" not found. ADR 0022 needs one Replacement per seeded type; add it to seed_type_components.ts and to this list.',
        rec ->> 0;
    END IF;

    SELECT id, user_id INTO action_id, action_owner
    FROM events_action
    WHERE action_name = rec ->> 1;

    IF action_id IS NULL THEN
      INSERT INTO events_action (action_name, i18n_key, replace_action)
      VALUES (rec ->> 1, rec ->> 2, TRUE)
      RETURNING id INTO action_id;
    ELSIF action_owner IS NOT NULL THEN
      -- action_name is unique across seeded and owner-created rows, so an owner holding
      -- this name blocks the seeded one. Adopting their Action would hand every owner a
      -- row this one user renames and deletes.
      RAISE EXCEPTION
        'Action "%" belongs to user %; the seeded Replacement cannot take its name (ADR 0022).',
        rec ->> 1, action_owner;
    ELSE
      UPDATE events_action
      SET replace_action = TRUE, i18n_key = rec ->> 2
      WHERE id = action_id;
    END IF;

    INSERT INTO event_action_targets (event_action_id, component_type_id)
    VALUES (action_id, type_id)
    ON CONFLICT (event_action_id, component_type_id) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Four actions that were never really Replacements
-- ---------------------------------------------------------------------------
-- Each replaces a sub-part the app does not track as a Component Type - a hose, an AXS
-- battery, a bearing. Being a Replacement made them borrow the part they sit on and end
-- it (ADR 0003), so replacing hub bearings zeroed the hub's wear. As ordinary work they
-- freeze a Wear Baseline instead, which is what "how far since the bearings" needs.
--
-- Past Services keep their rows and their already-dismounted parts: ADR 0001 refuses to
-- un-replace, so this is a fix going forward.
UPDATE events_action
SET replace_action = FALSE
WHERE user_id IS NULL
  AND action_name IN (
    'Battery Swap',
    'Brake Hose Replacement',
    'Hub Bearing Replacement',
    'Headset Bearing Replacement'
  );

-- ---------------------------------------------------------------------------
-- 4. A seeded name that was misspelled
-- ---------------------------------------------------------------------------
-- 'Grip Replecament'. The i18n key is derived from the English name, so it moves too and
-- the locale files follow.
UPDATE events_action
SET action_name = 'Grips Replacement', i18n_key = 'action.gripsReplacement'
WHERE user_id IS NULL
  AND action_name = 'Grip Replecament'
  AND NOT EXISTS (SELECT 1 FROM events_action WHERE action_name = 'Grips Replacement');

-- ---------------------------------------------------------------------------
-- 5. The catch-alls let go of the seeded types
-- ---------------------------------------------------------------------------
-- Every seeded type now has a Replacement that names it, so leaving the catch-all
-- attached would put two Replacements on one part - the picker this change removes,
-- rebuilt as two rows. Targets to owner-created types stay: those are what the catch-alls
-- are for from here on.
DELETE FROM event_action_targets AS t
USING events_action AS a, component_types AS ct
WHERE t.event_action_id = a.id
  AND t.component_type_id = ct.id
  AND a.user_id IS NULL
  AND a.replace_action
  AND a.action_name LIKE '%Part Replacement'
  AND ct.user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Past replacements read as the part they replaced
-- ---------------------------------------------------------------------------
-- writeReplacements creates one event_actions_done per replaced part, mapped to exactly
-- one component, so the type - and therefore the Replacement that names it - is
-- unambiguous. Runs after step 5, so the only Replacement still targeting the type is the
-- named one.
--
-- Published Reports are untouched: reports.snapshot resolves action names to text at
-- export (ADR 0011).
--
-- Left alone on purpose: rows whose part is an owner-created type (they keep the
-- catch-all, which still targets them), rows with no action_done_component_map entry to
-- read a type from, and the four actions demoted in step 3 - a Battery Swap was a battery
-- swap, and relabelling it "Derailleur Replacement" would claim a part was changed that
-- was not.
UPDATE event_actions_done AS done
SET event_action_id = named.id
FROM action_done_component_map AS map
JOIN components_mounted AS part ON part.id = map.component_mounted_id
JOIN component_types AS ct ON ct.id = part.component_type_id AND ct.user_id IS NULL
JOIN event_action_targets AS t ON t.component_type_id = ct.id
JOIN events_action AS named
  ON named.id = t.event_action_id AND named.replace_action AND named.user_id IS NULL
WHERE map.event_action_done_id = done.id
  AND done.part_replaced
  AND done.event_action_id IN (
    SELECT id FROM events_action
    WHERE user_id IS NULL AND replace_action AND action_name LIKE '%Part Replacement'
  );
