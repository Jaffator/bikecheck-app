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
    CREATE TABLE access_tokens (
      athlete_id INTEGER PRIMARY KEY NOT NULL,
      scope TEXT NOT NULL,
      access_token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE refresh_tokens (
      athlete_id INTEGER PRIMARY KEY NOT NULL,
      refresh_token TEXT NOT NULL,
      scope TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE strava_activities_raw (
      id BIGINT PRIMARY KEY NOT NULL,
      athlete_id INTEGER NOT NULL,
      activity_id TEXT NOT NULL,
      strava_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS access_tokens;
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS strava_activities_raw;
  `);
}

// Migrations that will create the tables for storing Strava access tokens, refresh tokens, and raw activity data. This is the initial migration for setting up the Strava-related tables in the database.
// npx node-pg-migrate up --envPath .env
