import { pgTable, uuid, text, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

// One row per user — combines the master-password auth verifier and the
// wrapped vault key since both are 1:1 with the user and always read together at unlock.
export const vaultUserKeys = pgTable(
  "vault_user_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kdfSalt: text("kdf_salt").notNull(), // base64, 16 random bytes, public (not secret)
    kdfIterations: integer("kdf_iterations").notNull().default(600_000),
    kdfHash: text("kdf_hash").notNull().default("SHA-256"),
    authHash: text("auth_hash").notNull(), // base64 HKDF("vaultkey-auth-v1") output — proves master password, cannot decrypt anything
    wrappedVaultKey: text("wrapped_vault_key").notNull(), // base64 AES-256-GCM ciphertext (tag included) of the raw vault key
    wrappedVaultKeyIv: text("wrapped_vault_key_iv").notNull(), // base64, 12 bytes
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdUq: unique("vault_user_keys_user_id_uq").on(table.userId),
  })
);

export const vaultFolders = pgTable(
  "vault_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nameCiphertext: text("name_ciphertext").notNull(), // base64 AES-256-GCM(vaultKey) — folder names are vault content too
    nameIv: text("name_iv").notNull(), // base64, 12 bytes
    sortOrder: integer("sort_order").notNull().default(0), // plaintext ordering int — not sensitive
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("vault_folders_user_idx").on(table.userId),
  })
);

export const vaultItems = pgTable(
  "vault_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => vaultFolders.id, { onDelete: "set null" }), // null = unfiled
    ciphertext: text("ciphertext").notNull(), // base64 AES-256-GCM(vaultKey) of JSON {title,username,password,url,notes,v}
    iv: text("iv").notNull(), // base64, 12 bytes — fresh random IV every write
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("vault_items_user_idx").on(table.userId),
    folderIdx: index("vault_items_folder_idx").on(table.folderId),
  })
);

export type VaultUserKeys = typeof vaultUserKeys.$inferSelect;
export type NewVaultUserKeys = typeof vaultUserKeys.$inferInsert;
export type VaultFolder = typeof vaultFolders.$inferSelect;
export type NewVaultFolder = typeof vaultFolders.$inferInsert;
export type VaultItem = typeof vaultItems.$inferSelect;
export type NewVaultItem = typeof vaultItems.$inferInsert;
