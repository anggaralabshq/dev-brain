import { Pool } from "pg";

// Idempotent SQL migrations — safe to run on every startup.
// Add new statements here instead of modifying existing ones.
const MIGRATIONS: string[] = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications_seen_at" timestamptz`,
];

export async function runMigrations(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://devbrain:devbrain_dev_only@localhost:5432/devbrain";

  const needsSsl =
    connectionString.includes("neon.tech") ||
    connectionString.includes("sslmode=require");

  const pool = new Pool({
    connectionString,
    max: 1,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    for (const sql of MIGRATIONS) {
      await pool.query(sql);
    }
    console.log(`[DevBrain] ${MIGRATIONS.length} migration(s) applied`);
  } catch (err) {
    console.error("[DevBrain] Migration failed:", err);
  } finally {
    await pool.end();
  }
}
