/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE strava_activities_raw
      ALTER COLUMN athlete_id TYPE BIGINT,
      ALTER COLUMN activity_id TYPE BIGINT USING activity_id::bigint,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

    -- The hand-altered dev database already has the identity; adding it twice fails.
    DO $$
    BEGIN
      IF (SELECT attidentity FROM pg_attribute
          WHERE attrelid = 'strava_activities_raw'::regclass AND attname = 'id') = '' THEN
        ALTER TABLE strava_activities_raw ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
      END IF;
    END $$;
  `);
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE strava_activities_raw
      ALTER COLUMN id DROP IDENTITY IF EXISTS,
      DROP COLUMN IF EXISTS updated_at,
      ALTER COLUMN activity_id TYPE TEXT,
      ALTER COLUMN athlete_id TYPE INTEGER;
  `);
}

// The init migration never matched the code: a raw row is inserted without an id and refreshed
// with updated_at, which only the hand-altered dev database had. Production failed every ride.
