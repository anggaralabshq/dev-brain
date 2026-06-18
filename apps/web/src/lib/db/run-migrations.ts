import { Pool } from "pg";

// Idempotent SQL migrations — safe to run on every startup.
// Add new statements here instead of modifying existing ones.
const MIGRATIONS: string[] = [
  // 0007: notes full-text search indexes
  `CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
  )`,
  `CREATE INDEX IF NOT EXISTS notes_tags_gin_idx ON notes USING GIN (tags)`,

  // 0008: ai_chats + ai_messages tables
  `CREATE TABLE IF NOT EXISTS "ai_chats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
    "title" text NOT NULL DEFAULT 'New Chat',
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "ai_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chat_id" uuid NOT NULL REFERENCES "ai_chats"("id") ON DELETE CASCADE,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "ai_chats_user_idx" ON "ai_chats" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "ai_chats_project_idx" ON "ai_chats" ("project_id")`,
  `CREATE INDEX IF NOT EXISTS "ai_messages_chat_idx" ON "ai_messages" ("chat_id")`,

  // 0009: notifications_seen_at on users
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications_seen_at" timestamptz`,

  // 0010: learning_items table
  `DO $$ BEGIN
    CREATE TYPE learning_status AS ENUM ('backlog', 'learning', 'done');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "learning_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "source_url" text,
    "source_name" text,
    "category" text,
    "status" learning_status NOT NULL DEFAULT 'backlog',
    "tags" text[] NOT NULL DEFAULT '{}',
    "personal_note" text NOT NULL DEFAULT '',
    "stars" integer,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "learning_items_user_idx" ON "learning_items" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "learning_items_status_idx" ON "learning_items" ("status")`,

  // 0010 (file): whiteboard public sharing
  `ALTER TABLE "whiteboards" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "whiteboards" ADD COLUMN IF NOT EXISTS "share_token" text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "whiteboards_share_token_uq" ON "whiteboards" ("share_token") WHERE "share_token" IS NOT NULL`,
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
