CREATE TABLE IF NOT EXISTS "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"data" text NOT NULL,
	"uploader_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pomodoro_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"work_duration_min" integer DEFAULT 25 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"interrupted_at" timestamp with time zone,
	"interruption_note" text,
	"session_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pomodoro_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"work_duration_min" integer DEFAULT 25 NOT NULL,
	"short_break_min" integer DEFAULT 5 NOT NULL,
	"long_break_min" integer DEFAULT 20 NOT NULL,
	"long_break_after" integer DEFAULT 4 NOT NULL,
	"auto_start_breaks" boolean DEFAULT false NOT NULL,
	"daily_goal" integer DEFAULT 8 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_pomodoros" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_pomodoros" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoro_settings" ADD CONSTRAINT "pomodoro_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_files_project_idx" ON "project_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_files_uploader_idx" ON "project_files" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pomodoro_sessions_user_idx" ON "pomodoro_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pomodoro_sessions_project_idx" ON "pomodoro_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pomodoro_sessions_task_idx" ON "pomodoro_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pomodoro_sessions_started_at_idx" ON "pomodoro_sessions" USING btree ("started_at");