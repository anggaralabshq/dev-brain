import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";
import { adrStatusEnum } from "./enums";

export const adrs = pgTable(
  "adrs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(), // auto-increment per project (ADR #12, etc.)
    title: text("title").notNull(),
    status: adrStatusEnum("status").notNull().default("proposed"),
    context: text("context").notNull().default(""),
    decision: text("decision").notNull().default(""),
    consequences: text("consequences").notNull().default(""),
    decisionDate: date("decision_date"),
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
    projectNumberUq: unique("adrs_project_number_uq").on(
      table.projectId,
      table.number
    ),
    projectIdx: index("adrs_project_idx").on(table.projectId),
    statusIdx: index("adrs_status_idx").on(table.status),
  })
);

export type Adr = typeof adrs.$inferSelect;
export type NewAdr = typeof adrs.$inferInsert;
