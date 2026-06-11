ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications_seen_at" timestamptz;
