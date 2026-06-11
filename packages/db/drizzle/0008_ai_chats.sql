CREATE TABLE IF NOT EXISTS "ai_chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'New Chat',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL REFERENCES "ai_chats"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_chats_user_idx" ON "ai_chats" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_chats_project_idx" ON "ai_chats" ("project_id");
CREATE INDEX IF NOT EXISTS "ai_messages_chat_idx" ON "ai_messages" ("chat_id");
