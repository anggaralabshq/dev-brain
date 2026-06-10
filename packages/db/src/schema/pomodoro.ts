import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";
import { tasks } from "./tasks";

export const pomodoroSessions = pgTable(
  "pomodoro_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workDurationMin: integer("work_duration_min").notNull().default(25),
    status: text("status").notNull().default("running"), // 'running'|'completed'|'interrupted'|'abandoned'
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    interruptedAt: timestamp("interrupted_at", { withTimezone: true }),
    interruptionNote: text("interruption_note"),
    sessionNote: text("session_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("pomodoro_sessions_user_idx").on(table.userId),
    projectIdx: index("pomodoro_sessions_project_idx").on(table.projectId),
    taskIdx: index("pomodoro_sessions_task_idx").on(table.taskId),
    startedAtIdx: index("pomodoro_sessions_started_at_idx").on(table.startedAt),
  })
);

export const pomodoroSettings = pgTable("pomodoro_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  workDurationMin: integer("work_duration_min").notNull().default(25),
  shortBreakMin: integer("short_break_min").notNull().default(5),
  longBreakMin: integer("long_break_min").notNull().default(20),
  longBreakAfter: integer("long_break_after").notNull().default(4),
  autoStartBreaks: boolean("auto_start_breaks").notNull().default(false),
  dailyGoal: integer("daily_goal").notNull().default(8),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PomodoroSession = typeof pomodoroSessions.$inferSelect;
export type NewPomodoroSession = typeof pomodoroSessions.$inferInsert;
export type PomodoroSettings = typeof pomodoroSettings.$inferSelect;
