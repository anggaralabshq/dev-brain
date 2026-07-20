"use server";

import { timingSafeEqual } from "node:crypto";
import { requireUser } from "@/lib/auth/current-user";
import {
  getVaultUserKeys,
  createVaultUserKeys,
  updateVaultUserKeys,
  resetVault,
} from "@/lib/db/vault";

type SetupStatus =
  | { isSetup: false }
  | { isSetup: true; kdfSalt: string; kdfIterations: number; kdfHash: string };

/** Public KDF params only — no secrets. Needed before the client can even compute an auth hash. */
export async function getVaultSetupStatusAction(): Promise<SetupStatus> {
  const user = await requireUser();
  const row = await getVaultUserKeys(user.id);
  if (!row) return { isSetup: false };
  return {
    isSetup: true,
    kdfSalt: row.kdfSalt,
    kdfIterations: row.kdfIterations,
    kdfHash: row.kdfHash,
  };
}

function constantTimeEqualB64(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "base64");
  const bufB = Buffer.from(b, "base64");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function setupVaultAction(input: {
  kdfSalt: string;
  kdfIterations: number;
  kdfHash: string;
  authHash: string;
  wrappedVaultKey: string;
  wrappedVaultKeyIv: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const existing = await getVaultUserKeys(user.id);
  if (existing) return { ok: false, error: "Vault already set up" };

  await createVaultUserKeys({ userId: user.id, ...input });
  return { ok: true };
}

export async function unlockVaultAction(
  authHash: string
): Promise<
  | { ok: true; wrappedVaultKey: string; wrappedVaultKeyIv: string }
  | { ok: false }
> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false };

  const row = await getVaultUserKeys(user.id);
  if (!row) return { ok: false };

  if (!constantTimeEqualB64(row.authHash, authHash)) return { ok: false };

  return {
    ok: true,
    wrappedVaultKey: row.wrappedVaultKey,
    wrappedVaultKeyIv: row.wrappedVaultKeyIv,
  };
}

export async function changeMasterPasswordAction(input: {
  oldAuthHash: string;
  newKdfSalt: string;
  newKdfIterations: number;
  newKdfHash: string;
  newAuthHash: string;
  newWrappedVaultKey: string;
  newWrappedVaultKeyIv: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const row = await getVaultUserKeys(user.id);
  if (!row) return { ok: false, error: "Vault not set up" };

  if (!constantTimeEqualB64(row.authHash, input.oldAuthHash)) {
    return { ok: false, error: "Current master password is incorrect" };
  }

  await updateVaultUserKeys(user.id, {
    kdfSalt: input.newKdfSalt,
    kdfIterations: input.newKdfIterations,
    kdfHash: input.newKdfHash,
    authHash: input.newAuthHash,
    wrappedVaultKey: input.newWrappedVaultKey,
    wrappedVaultKeyIv: input.newWrappedVaultKeyIv,
  });

  return { ok: true };
}

/** Destructive — wipes all items/folders/keys for this user. Requires proof of the current master password. */
export async function resetVaultAction(
  authHash: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const row = await getVaultUserKeys(user.id);
  if (!row) return { ok: false, error: "Vault not set up" };

  if (!constantTimeEqualB64(row.authHash, authHash)) {
    return { ok: false, error: "Master password is incorrect" };
  }

  await resetVault(user.id);
  return { ok: true };
}
