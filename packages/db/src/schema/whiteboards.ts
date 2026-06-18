import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { projects } from "./projects";

export const whiteboards = pgTable(
  "whiteboards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled diagram"),
    description: text("description").notNull().default(""),
    /** tldraw document state — opaque JSON */
    data: jsonb("data").notNull().$type<unknown>(),
    /** Optional thumbnail / preview (data URL) */
    thumbnail: text("thumbnail"),
    isPublic: boolean("is_public").notNull().default(false),
    /** UUID token for public share links — null when not shared */
    shareToken: text("share_token"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectIdx: index("whiteboards_project_idx").on(table.projectId),
    shareTokenUq: uniqueIndex("whiteboards_share_token_uq")
      .on(table.shareToken)
      .where(sql`${table.shareToken} IS NOT NULL`),
  })
);

export type Whiteboard = typeof whiteboards.$inferSelect;
export type NewWhiteboard = typeof whiteboards.$inferInsert;
