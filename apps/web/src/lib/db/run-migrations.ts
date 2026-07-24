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

  // 0011: vaultkey tables
  `CREATE TABLE IF NOT EXISTS "vault_user_keys" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "kdf_salt" text NOT NULL,
    "kdf_iterations" integer NOT NULL DEFAULT 600000,
    "kdf_hash" text NOT NULL DEFAULT 'SHA-256',
    "auth_hash" text NOT NULL,
    "wrapped_vault_key" text NOT NULL,
    "wrapped_vault_key_iv" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "vault_user_keys_user_id_uq" ON "vault_user_keys" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "vault_folders" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name_ciphertext" text NOT NULL,
    "name_iv" text NOT NULL,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "vault_folders_user_idx" ON "vault_folders" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "vault_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "folder_id" uuid REFERENCES "vault_folders"("id") ON DELETE SET NULL,
    "ciphertext" text NOT NULL,
    "iv" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "vault_items_user_idx" ON "vault_items" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "vault_items_folder_idx" ON "vault_items" ("folder_id")`,

  // 0012: forest monitor tables
  `DO $$ BEGIN
    CREATE TYPE forest_region_level AS ENUM ('provinsi', 'kabupaten', 'kecamatan');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE forest_alert_source AS ENUM ('gfw', 'firms');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "forest_regions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "level" forest_region_level NOT NULL,
    "parent_id" uuid,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "forest_alerts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "region_id" uuid REFERENCES "forest_regions"("id") ON DELETE SET NULL,
    "source" forest_alert_source NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "area_ha" double precision,
    "detected_at" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "forest_alerts_source_loc_time_uq" UNIQUE ("source", "lat", "lng", "detected_at")
  )`,
  `CREATE TABLE IF NOT EXISTS "forest_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "telegram_chat_id" text NOT NULL,
    "region_id" uuid NOT NULL REFERENCES "forest_regions"("id") ON DELETE CASCADE,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "forest_subscriptions_chat_region_uq" UNIQUE ("telegram_chat_id", "region_id")
  )`,
  `CREATE INDEX IF NOT EXISTS "forest_regions_level_idx" ON "forest_regions" ("level")`,
  `CREATE INDEX IF NOT EXISTS "forest_regions_parent_idx" ON "forest_regions" ("parent_id")`,
  `CREATE INDEX IF NOT EXISTS "forest_alerts_region_idx" ON "forest_alerts" ("region_id")`,
  `CREATE INDEX IF NOT EXISTS "forest_alerts_detected_idx" ON "forest_alerts" ("detected_at")`,
  `CREATE INDEX IF NOT EXISTS "forest_subscriptions_region_idx" ON "forest_subscriptions" ("region_id")`,

  // 0013: ai_settings — per-user Anthropic API key
  `CREATE TABLE IF NOT EXISTS "ai_settings" (
    "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "anthropic_api_key" text,
    "updated_at" timestamptz DEFAULT now() NOT NULL
  )`,
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
