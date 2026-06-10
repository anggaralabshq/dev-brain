import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";
import { taskStatusEnum, taskPriorityEnum } from "./enums";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    estimatedPomodoros: integer("estimated_pomodoros"),
    completedPomodoros: integer("completed_pomodoros").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectIdx: index("tasks_project_idx").on(table.projectId),
    statusIdx: index("tasks_status_idx").on(table.status),
    assigneeIdx: index("tasks_assignee_idx").on(table.assigneeId),
  })
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
