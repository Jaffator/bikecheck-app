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
    CREATE TABLE oauth_states (
      state TEXT PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX oauth_states_expires_at_idx ON oauth_states (expires_at);
  `);
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS oauth_states;
  `);
}

// Short-lived CSRF states for the Strava OAuth flow. A state links the authorize
// redirect back to the user who started it, so the callback never has to trust a
// user id coming from the query string.
// npx node-pg-migrate up --envPath .env
