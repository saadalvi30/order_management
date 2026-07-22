const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false,
  },
});
pool.on("connect", () => {
  console.log("✅ Connected to Supabase PostgreSQL");
});
pool.on("error", (err) => {
  console.error("Database Error:", err);
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});

/**
 * Runs a callback inside a single transaction. Acquires one dedicated
 * client from the pool, BEGINs, passes the client to the callback so
 * every query inside uses the same connection, then COMMITs on success
 * or ROLLBACKs on any thrown error. Always releases the client back
 * to the pool afterwards.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { query: (...args) => pool.query(...args), withTransaction, pool };