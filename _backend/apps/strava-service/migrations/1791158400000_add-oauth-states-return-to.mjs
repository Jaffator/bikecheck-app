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
    ALTER TABLE oauth_states
      ADD COLUMN return_to TEXT NOT NULL DEFAULT 'native'
      CHECK (return_to IN ('web', 'native'));
  `);
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE oauth_states DROP COLUMN IF EXISTS return_to;
  `);
}

// Where the callback sends the browser: the web app (desktop) or the installed app's deep link.
// Default 'native' keeps states issued before this column on the old deep-link path.
