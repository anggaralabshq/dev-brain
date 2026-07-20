/**
 * Server-side data access for VaultKey.
 *
 * Every function takes `userId` as a required, non-optional parameter and every
 * query is scoped by it — unlike notes.ts's optional `authorId` filter, scoping
 * here can never be silently omitted by a caller.
 */
import "server-only";
import { db } from "@devbrain/db";
import { vaultUserKeys, vaultFolders, vaultItems } from "@devbrain/db/schema";
import { eq, and } from "drizzle-orm";

// ─── vault_user_keys ────────────────────────────────────────────────────────

export async function getVaultUserKeys(userId: string) {
  const [row] = await db
    .select()
    .from(vaultUserKeys)
    .where(eq(vaultUserKeys.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function createVaultUserKeys(input: {
  userId: string;
  kdfSalt: string;
  kdfIterations: number;
  kdfHash: string;
  authHash: string;
  wrappedVaultKey: string;
  wrappedVaultKeyIv: string;
}) {
  const [row] = await db.insert(vaultUserKeys).values(input).returning();
  return row;
}

/** Wipes all vault data for a user: items, folders, then the key row itself. */
export async function resetVault(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(vaultItems).where(eq(vaultItems.userId, userId));
    await tx.delete(vaultFolders).where(eq(vaultFolders.userId, userId));
    await tx.delete(vaultUserKeys).where(eq(vaultUserKeys.userId, userId));
  });
}

export async function updateVaultUserKeys(
  userId: string,
  input: {
    kdfSalt: string;
    kdfIterations: number;
    kdfHash: string;
    authHash: string;
    wrappedVaultKey: string;
    wrappedVaultKeyIv: string;
  }
) {
  const [row] = await db
    .update(vaultUserKeys)
    .set(input)
    .where(eq(vaultUserKeys.userId, userId))
    .returning();
  return row ?? null;
}

// ─── vault_folders ──────────────────────────────────────────────────────────

export async function getVaultFolders(userId: string) {
  return db
    .select()
    .from(vaultFolders)
    .where(eq(vaultFolders.userId, userId))
    .orderBy(vaultFolders.sortOrder);
}

export async function createVaultFolder(input: {
  userId: string;
  nameCiphertext: string;
  nameIv: string;
  sortOrder?: number;
}) {
  const [row] = await db.insert(vaultFolders).values(input).returning();
  return row;
}

export async function updateVaultFolder(
  id: string,
  userId: string,
  input: { nameCiphertext?: string; nameIv?: string; sortOrder?: number }
) {
  const [row] = await db
    .update(vaultFolders)
    .set(input)
    .where(and(eq(vaultFolders.id, id), eq(vaultFolders.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteVaultFolder(id: string, userId: string) {
  const [row] = await db
    .delete(vaultFolders)
    .where(and(eq(vaultFolders.id, id), eq(vaultFolders.userId, userId)))
    .returning({ id: vaultFolders.id });
  return row ?? null;
}

// ─── vault_items ────────────────────────────────────────────────────────────

export async function getVaultItems(userId: string) {
  return db.select().from(vaultItems).where(eq(vaultItems.userId, userId));
}

export async function createVaultItem(input: {
  userId: string;
  folderId: string | null;
  ciphertext: string;
  iv: string;
}) {
  const [row] = await db.insert(vaultItems).values(input).returning();
  return row;
}

export async function updateVaultItem(
  id: string,
  userId: string,
  input: { folderId?: string | null; ciphertext?: string; iv?: string }
) {
  const [row] = await db
    .update(vaultItems)
    .set(input)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteVaultItem(id: string, userId: string) {
  const [row] = await db
    .delete(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId)))
    .returning({ id: vaultItems.id });
  return row ?? null;
}
