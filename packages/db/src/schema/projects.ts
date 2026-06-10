import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { projectStatusEnum } from "./enums";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: projectStatusEnum("status").notNull().default("planning"),
    progress: integer("progress").notNull().default(0),
    color: text("color").notNull().default("violet"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    starred: boolean("starred").notNull().default(false),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugUq: unique("projects_slug_uq").on(table.slug),
    statusIdx: index("projects_status_idx").on(table.status),
    ownerIdx: index("projects_owner_idx").on(table.ownerId),
  })
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
