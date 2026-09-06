-- Every Component Type gets a Replacement (ADR 0018), delivered by migration rather than by
-- the seed script (ADR 0019): the nine `<Category> Part Replacement` catch-alls live only in
-- scripts/seedData/seed_data.json, which no deployed database read.
--
-- The rule is the invariant, not a copy of the seed file: every Component Type without a
-- Replacement joins its category's catch-all. Owner-created types included — the backfill in
-- 20260906120000 found no catch-all to point them at, and will not run again.
--
-- Idempotent: re-running inserts nothing.
DO $$
DECLARE
  -- Keyed by group_name, because ids differ between environments. Three categories name
  -- their catch-all differently from themselves. The name comes from seed_data.json, the
  -- key from toI18nKey() over that name, so a rename is one edit in each place.
  catch_all_names CONSTANT jsonb := jsonb_build_object(
    'Suspension',        jsonb_build_object('name', 'Suspension Part Replacement', 'i18n_key', 'action.suspensionPartReplacement'),
    'Frame',             jsonb_build_object('name', 'Frame Part Replacement',      'i18n_key', 'action.framePartReplacement'),
    'Cockpit',           jsonb_build_object('name', 'Cockpit Part Replacement',    'i18n_key', 'action.cockpitPartReplacement'),
    'Saddle & Seatpost', jsonb_build_object('name', 'Saddle Part Replacement',     'i18n_key', 'action.saddlePartReplacement'),
    'Wheels',            jsonb_build_object('name', 'Wheels Part Replacement',     'i18n_key', 'action.wheelsPartReplacement'),
    'Drivetrain',        jsonb_build_object('name', 'Drivetrain Part Replacement', 'i18n_key', 'action.drivetrainPartReplacement'),
    'Brakes',            jsonb_build_object('name', 'Brakes Part Replacement',     'i18n_key', 'action.brakesPartReplacement'),
    'E-bike',            jsonb_build_object('name', 'Ebike Part Replacement',      'i18n_key', 'action.ebikePartReplacement'),
    -- The seed file names this category 'Other' and every deployed database names it
    -- 'Misc'. Both spellings are mapped until that drift is settled.
    'Misc',              jsonb_build_object('name', 'Other Part Replacement',      'i18n_key', 'action.otherPartReplacement'),
    'Other',             jsonb_build_object('name', 'Other Part Replacement',      'i18n_key', 'action.otherPartReplacement')
  );
  grp RECORD;
  catch_all JSONB;
  catch_all_id INT;
  catch_all_owner INT;
BEGIN
  -- Both spellings share one catch-all name, so a database carrying both categories would
  -- hang one Action off two of them — not the one row per category ADR 0017 requires.
  IF (SELECT count(*) FROM component_groups WHERE group_name IN ('Misc', 'Other')) > 1 THEN
    RAISE EXCEPTION 'Component groups "Misc" and "Other" both exist; one catch-all cannot serve two categories (ADR 0017).';
  END IF;

  FOR grp IN SELECT id, group_name FROM component_groups ORDER BY id LOOP
    catch_all := catch_all_names -> grp.group_name;

    -- A category the map does not know would leave its parts without a Replacement, and
    -- would give owner-created types in it nothing to attach to. Stopping the deployment is
    -- the point: this migration exists because that breakage went unnoticed for months.
    IF catch_all IS NULL THEN
      RAISE EXCEPTION
        'No catch-all Replacement mapped for component group "%". Add it to seed_data.json, to this map, to seed_catalogue.unit.test.ts and to the locale files (ADR 0019).',
        grp.group_name;
    END IF;

    -- Reset: SELECT INTO leaves the previous iteration's values when it finds no row.
    catch_all_id := NULL;
    catch_all_owner := NULL;
    SELECT id, user_id INTO catch_all_id, catch_all_owner
    FROM events_action
    WHERE action_name = catch_all ->> 'name';

    IF catch_all_id IS NULL THEN
      INSERT INTO events_action (action_name, i18n_key, replace_action)
      VALUES (catch_all ->> 'name', catch_all ->> 'i18n_key', TRUE)
      RETURNING id INTO catch_all_id;
    ELSIF catch_all_owner IS NOT NULL THEN
      -- action_name is unique across seeded and owner-created rows, so an owner who took
      -- this name blocks the seeded one. Adopting their Action would hand every owner of
      -- the category a row this one user renames and deletes.
      RAISE EXCEPTION
        'Action "%" belongs to user %; the seeded catch-all cannot take its name (ADR 0019).',
        catch_all ->> 'name', catch_all_owner;
    ELSE
      UPDATE events_action
      SET replace_action = TRUE, i18n_key = catch_all ->> 'i18n_key'
      WHERE id = catch_all_id;
    END IF;

    -- Only the uncovered ones. A type already reached by a named Replacement — Chain, Tire,
    -- Grips — keeps that one alone, so the catch-all never becomes the narrower match the
    -- picker prefers. A Replacement one owner created covers the type only for that owner.
    INSERT INTO event_action_targets (event_action_id, component_type_id)
    SELECT catch_all_id, ct.id
    FROM component_types AS ct
    WHERE ct.component_group_id = grp.id
      AND NOT EXISTS (
        SELECT 1
        FROM event_action_targets AS t
        JOIN events_action AS a ON a.id = t.event_action_id AND a.replace_action
        WHERE t.component_type_id = ct.id
          AND (a.user_id IS NULL OR a.user_id = ct.user_id)
      )
    ON CONFLICT (event_action_id, component_type_id) DO NOTHING;
  END LOOP;
END $$;
