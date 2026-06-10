import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""), // markdown source
    excerpt: text("excerpt").notNull().default(""),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }), // null = personal note (across all projects)
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    pinned: boolean("pinned").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
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
    // Slug globally unique (for clean URLs like /notes/[slug])
    slugUq: unique("notes_slug_uq").on(table.slug),
    projectIdx: index("notes_project_idx").on(table.projectId),
    authorIdx: index("notes_author_idx").on(table.authorId),
    pinnedIdx: index("notes_pinned_idx").on(table.pinned),
  })
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
