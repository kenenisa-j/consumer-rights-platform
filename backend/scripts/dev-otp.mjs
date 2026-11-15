// Development only: prints the latest sign-up code sent to a phone number, because no SMS is sent yet.
// Usage: npm run dev:otp -- 0911234567   (or +251911234567)
import pg from "pg";

if (process.env.NODE_ENV === "production") throw new Error("Not available in production.");
if (typeof process.loadEnvFile === "function") { try { process.loadEnvFile(new URL("../../.env", import.meta.url)); } catch { /* optional */ } }

const raw = (process.argv[2] ?? "").replace(/[\s-]/g, "");
const phone = /^\+251[79]\d{8}$/.test(raw) ? raw : /^0[79]\d{8}$/.test(raw) ? `+251${raw.slice(1)}` : null;
if (!phone) { console.error("Give a phone number, for example: npm run dev:otp -- 0911234567"); process.exit(1); }

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query(
    `select value, expires_at from verifications where identifier like $1 and expires_at > now() order by created_at desc limit 1`, [`%${phone}%`]);
  if (!rows[0]) console.log(`No live code for ${phone}. Ask for a code in the form first (codes last 5 minutes).`);
  else console.log(`Code for ${phone}: ${String(rows[0].value).split(":")[0]}`);
} finally { await pool.end(); }
