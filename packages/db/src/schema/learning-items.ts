import {
  pgTable, uuid, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { learningStatusEnum } from "./enums";

export const learningItems = pgTable(
  "learning_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sourceUrl: text("source_url"),
    sourceName: text("source_name"), // "github" | "hn" | "papers" | "manual" | "ai"
    category: text("category"),
    status: learningStatusEnum("status").notNull().default("backlog"),
    tags: text("tags").array().notNull().default([]),
    personalNote: text("personal_note").notNull().default(""),
    stars: integer("stars"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("learning_items_user_idx").on(table.userId),
    statusIdx: index("learning_items_status_idx").on(table.status),
  })
);

export type LearningItem = typeof learningItems.$inferSelect;
export type NewLearningItem = typeof learningItems.$inferInsert;
