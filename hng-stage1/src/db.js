/**
 * db.js — PostgreSQL connection pool + schema initialisation
 *
 * We use a connection pool (pg.Pool) rather than a single client so
 * the server can handle multiple concurrent requests without queuing.
 *
 * The table is created automatically on first boot, so there is no
 * manual migration step required.
 */

const { Pool } = require('pg');

// Railway injects DATABASE_URL as an environment variable.
// For local development, put it in a .env file (see .env.example).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Railway Postgres always requires SSL. We enable it whenever
  // DATABASE_URL is set (i.e. on any deployed environment).
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

/**
 * Creates the profiles table if it does not already exist.
 * Called once when the server boots.
 */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id               UUID          PRIMARY KEY,
      name             VARCHAR(255)  UNIQUE NOT NULL,
      gender           VARCHAR(50),
      gender_probability FLOAT,
      sample_size      INTEGER,
      age              INTEGER,
      age_group        VARCHAR(50),
      country_id       VARCHAR(10),
      country_probability FLOAT,
      created_at       TIMESTAMPTZ   DEFAULT NOW()
    );
  `);
  console.log('Database table ready.');
}

module.exports = { pool, initDB };
