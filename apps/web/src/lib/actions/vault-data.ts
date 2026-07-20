"use server";

import { requireUser } from "@/lib/auth/current-user";
import {
  getVaultItems,
  createVaultItem,
  updateVaultItem,
  deleteVaultItem,
  getVaultFolders,
  createVaultFolder,
  updateVaultFolder,
  deleteVaultFolder,
} from "@/lib/db/vault";

// Pure ciphertext pass-throughs — never JSON.parse or inspect plaintext shape here.

export async function getVaultDataAction() {
  const user = await requireUser();
  const [items, folders] = await Promise.all([
    getVaultItems(user.id),
    getVaultFolders(user.id),
  ]);
  return { items, folders };
}

export async function createVaultItemAction(input: {
  folderId: string | null;
  ciphertext: string;
  iv: string;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };
  const row = await createVaultItem({ userId: user.id, ...input });
  return { ok: true, id: row.id };
}

export async function updateVaultItemAction(input: {
  id: string;
  folderId: string | null;
  ciphertext: string;
  iv: string;
}): Promise<{ ok: true } | { ok: false }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };
  const row = await updateVaultItem(input.id, user.id, {
    folderId: input.folderId,
    ciphertext: input.ciphertext,
    iv: input.iv,
  });
  return row ? { ok: true } : { ok: false };
}

export async function deleteVaultItemAction(
  id: string
): Promise<{ ok: true } | { ok: false }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };
  const row = await deleteVaultItem(id, user.id);
  return row ? { ok: true } : { ok: false };
}

export async function createVaultFolderAction(input: {
  nameCiphertext: string;
  nameIv: string;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };
  const row = await createVaultFolder({ userId: user.id, ...input });
  return { ok: true, id: row.id };
}

export async function updateVaultFolderAction(input: {
  id: string;
  nameCiphertext?: string;
  nameIv?: string;
  sortOrder?: number;
}): Promise<{ ok: true } | { ok: false }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };
  const { id, ...rest } = input;
  const row = await updateVaultFolder(id, user.id, rest);
  return row ? { ok: true } : { ok: false };
}

export async function deleteVaultFolderAction(
  id: string
): Promise<{ ok: true } | { ok: false }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };
  const row = await deleteVaultFolder(id, user.id);
  return row ? { ok: true } : { ok: false };
}
