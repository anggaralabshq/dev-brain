import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const forestRegionLevelEnum = pgEnum("forest_region_level", [
  "provinsi",
  "kabupaten",
  "kecamatan",
]);

export const forestAlertSourceEnum = pgEnum("forest_alert_source", [
  "gfw",
  "firms",
]);

export type ForestRegionLevel = (typeof forestRegionLevelEnum.enumValues)[number];
export type ForestAlertSource = (typeof forestAlertSourceEnum.enumValues)[number];

export const forestRegions = pgTable(
  "forest_regions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    level: forestRegionLevelEnum("level").notNull(),
    parentId: uuid("parent_id"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    levelIdx: index("forest_regions_level_idx").on(table.level),
    parentIdx: index("forest_regions_parent_idx").on(table.parentId),
  })
);

export const forestAlerts = pgTable(
  "forest_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    regionId: uuid("region_id").references(() => forestRegions.id, {
      onDelete: "set null",
    }),
    source: forestAlertSourceEnum("source").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    areaHa: doublePrecision("area_ha"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    regionIdx: index("forest_alerts_region_idx").on(table.regionId),
    detectedIdx: index("forest_alerts_detected_idx").on(table.detectedAt),
    sourceUq: unique("forest_alerts_source_loc_time_uq").on(
      table.source,
      table.lat,
      table.lng,
      table.detectedAt
    ),
  })
);

export const forestSubscriptions = pgTable(
  "forest_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    telegramChatId: text("telegram_chat_id").notNull(),
    regionId: uuid("region_id")
      .notNull()
      .references(() => forestRegions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    chatRegionUq: unique("forest_subscriptions_chat_region_uq").on(
      table.telegramChatId,
      table.regionId
    ),
    regionIdx: index("forest_subscriptions_region_idx").on(table.regionId),
  })
);

export type ForestRegion = typeof forestRegions.$inferSelect;
export type NewForestRegion = typeof forestRegions.$inferInsert;
export type ForestAlert = typeof forestAlerts.$inferSelect;
export type NewForestAlert = typeof forestAlerts.$inferInsert;
export type ForestSubscription = typeof forestSubscriptions.$inferSelect;
export type NewForestSubscription = typeof forestSubscriptions.$inferInsert;
