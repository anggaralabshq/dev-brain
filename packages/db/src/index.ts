import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://devbrain:devbrain_dev_only@localhost:5432/devbrain";

// Singleton pattern for Next.js HMR
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Neon (and other hosted PG) requires SSL; detect from URL so no extra env var needed
const needsSsl =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: 10,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
export * from "./schema";
