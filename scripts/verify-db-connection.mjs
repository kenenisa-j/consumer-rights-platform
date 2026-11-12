// Safe database connectivity verification script for development & CI verification
import { Pool } from "pg";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional if environment variables are provided by the shell
  }
}

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.error("FAIL: DATABASE_URL is not set in environment or .env file.");
  process.exit(1);
}

// Sanitize URL for safe logging
const safeUrl = rawUrl.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1*****$3");
console.log(`Connecting to database at ${safeUrl}...`);

const pool = new Pool({ connectionString: rawUrl, connectionTimeoutMillis: 5000 });

try {
  const result = await pool.query("SELECT 1 AS connected, current_database() AS db_name, version() AS pg_version;");
  const row = result.rows[0];
  console.log(`SUCCESS: Connected to PostgreSQL database '${row.db_name}'.`);
  console.log(`Server version: ${row.pg_version.split(" on ")[0]}`);
  await pool.end();
  process.exit(0);
} catch (error) {
  const safeMessage = (error.message || String(error)).replace(
    /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
    "$1*****$3"
  );
  console.error(`FAIL: Database connection failed: ${safeMessage}`);
  await pool.end().catch(() => {});
  process.exit(1);
}
