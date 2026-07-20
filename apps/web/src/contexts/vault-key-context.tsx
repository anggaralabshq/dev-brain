"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  getVaultSetupStatusAction,
  setupVaultAction,
  unlockVaultAction,
  changeMasterPasswordAction,
  resetVaultAction,
} from "@/lib/actions/vault-auth";
import {
  getVaultDataAction,
  createVaultItemAction,
  updateVaultItemAction,
  deleteVaultItemAction,
  createVaultFolderAction,
  updateVaultFolderAction,
  deleteVaultFolderAction,
} from "@/lib/actions/vault-data";
import { generateSaltB64, stretchMasterPassword, deriveAuthAndEncKeys, PBKDF2_ITERATIONS } from "@/lib/crypto/kdf";
import { generateVaultKey, wrapVaultKey, unwrapVaultKey } from "@/lib/crypto/vault-key";
import {
  encryptItemPayload,
  decryptItemPayload,
  encryptFolderName,
  decryptFolderName,
  type VaultItemPayload,
} from "@/lib/crypto/vault-items";
import { getAutoLockMinutes, setAutoLockMinutes as persistAutoLockMinutes } from "@/lib/vault-prefs";

export type VaultStatus = "loading" | "needs-setup" | "locked" | "unlocked";

export type DecryptedVaultItem = VaultItemPayload & { id: string; folderId: string | null };
export type DecryptedVaultFolder = { id: string; name: string; sortOrder: number };

type Result = { ok: boolean; error?: string };

type VaultCtx = {
  status: VaultStatus;
  items: DecryptedVaultItem[];
  folders: DecryptedVaultFolder[];
  setup: (masterPassword: string) => Promise<Result>;
  unlock: (masterPassword: string) => Promise<Result>;
  lock: () => void;
  changeMasterPassword: (oldPw: string, newPw: string) => Promise<Result>;
  resetVault: (masterPassword: string) => Promise<Result>;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
  createItem: (payload: VaultItemPayload, folderId: string | null) => Promise<void>;
  updateItem: (id: string, payload: VaultItemPayload, folderId: string | null) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
};

const VaultKeyContext = createContext<VaultCtx | null>(null);

export function useVaultKey(): VaultCtx {
  const ctx = useContext(VaultKeyContext);
  if (!ctx) throw new Error("useVaultKey must be used within VaultKeyProvider");
  return ctx;
}

export function VaultKeyProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [items, setItems] = useState<DecryptedVaultItem[]>([]);
  const [folders, setFolders] = useState<DecryptedVaultFolder[]>([]);
  // The unwrapped vault key lives here only — never localStorage/sessionStorage,
  // never serialized. A page reload remounts this provider from scratch, which
  // is the entire "re-prompt on reload, no remember-me" requirement — free.
  const vaultKeyRef = useRef<CryptoKey | null>(null);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(5);

  useEffect(() => {
    setAutoLockMinutesState(getAutoLockMinutes());
    getVaultSetupStatusAction().then((res) => {
      setStatus(res.isSetup ? "locked" : "needs-setup");
    });
  }, []);

  const setAutoLockMinutes = useCallback((minutes: number) => {
    persistAutoLockMinutes(minutes);
    setAutoLockMinutesState(minutes);
  }, []);

  const loadAndDecrypt = useCallback(async (vaultKey: CryptoKey) => {
    const { items: itemRows, folders: folderRows } = await getVaultDataAction();
    const decryptedItems = await Promise.all(
      itemRows.map(async (row) => ({
        id: row.id,
        folderId: row.folderId,
        ...(await decryptItemPayload(vaultKey, row)),
      }))
    );
    const decryptedFolders = await Promise.all(
      folderRows.map(async (row) => ({
        id: row.id,
        sortOrder: row.sortOrder,
        name: await decryptFolderName(vaultKey, row),
      }))
    );
    setItems(decryptedItems);
    setFolders(decryptedFolders);
  }, []);

  const setup = useCallback(
    async (masterPassword: string): Promise<Result> => {
      const kdfSalt = generateSaltB64();
      const stretched = await stretchMasterPassword(masterPassword, kdfSalt, PBKDF2_ITERATIONS);
      const { authHashB64, encKey } = await deriveAuthAndEncKeys(stretched);
      const vaultKey = await generateVaultKey();
      const { wrappedB64, ivB64 } = await wrapVaultKey(vaultKey, encKey);

      const res = await setupVaultAction({
        kdfSalt,
        kdfIterations: PBKDF2_ITERATIONS,
        kdfHash: "SHA-256",
        authHash: authHashB64,
        wrappedVaultKey: wrappedB64,
        wrappedVaultKeyIv: ivB64,
      });
      if (!res.ok) return res;

      vaultKeyRef.current = vaultKey;
      await loadAndDecrypt(vaultKey);
      setStatus("unlocked");
      return { ok: true };
    },
    [loadAndDecrypt]
  );

  const unlock = useCallback(
    async (masterPassword: string): Promise<Result> => {
      const statusRes = await getVaultSetupStatusAction();
      if (!statusRes.isSetup) return { ok: false, error: "Vault not set up" };

      const stretched = await stretchMasterPassword(
        masterPassword,
        statusRes.kdfSalt,
        statusRes.kdfIterations
      );
      const { authHashB64, encKey } = await deriveAuthAndEncKeys(stretched);

      const res = await unlockVaultAction(authHashB64);
      if (!res.ok) return { ok: false, error: "Incorrect master password" };

      let vaultKey: CryptoKey;
      try {
        vaultKey = await unwrapVaultKey(res.wrappedVaultKey, res.wrappedVaultKeyIv, encKey);
      } catch {
        return { ok: false, error: "Incorrect master password" };
      }

      vaultKeyRef.current = vaultKey;
      await loadAndDecrypt(vaultKey);
      setStatus("unlocked");
      return { ok: true };
    },
    [loadAndDecrypt]
  );

  const lock = useCallback(() => {
    vaultKeyRef.current = null;
    setItems([]);
    setFolders([]);
    setStatus("locked");
  }, []);

  // Idle auto-lock. autoLockMinutes <= 0 means "never". Re-runs whenever the
  // setting changes so it takes effect immediately, not just on next unlock.
  useEffect(() => {
    if (status !== "unlocked" || autoLockMinutes <= 0) return;

    let lastActivity = Date.now();
    const bump = () => {
      lastActivity = Date.now();
    };
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > autoLockMinutes * 60_000) lock();
    }, 5_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(interval);
    };
  }, [status, autoLockMinutes, lock]);

  const changeMasterPassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<Result> => {
      const statusRes = await getVaultSetupStatusAction();
      if (!statusRes.isSetup) return { ok: false, error: "Vault not set up" };

      const oldStretched = await stretchMasterPassword(
        oldPassword,
        statusRes.kdfSalt,
        statusRes.kdfIterations
      );
      const { authHashB64: oldAuthHash, encKey: oldEncKey } = await deriveAuthAndEncKeys(oldStretched);

      const unlockRes = await unlockVaultAction(oldAuthHash);
      if (!unlockRes.ok) return { ok: false, error: "Current master password is incorrect" };

      let vaultKey: CryptoKey;
      try {
        vaultKey = await unwrapVaultKey(unlockRes.wrappedVaultKey, unlockRes.wrappedVaultKeyIv, oldEncKey);
      } catch {
        return { ok: false, error: "Current master password is incorrect" };
      }

      const newKdfSalt = generateSaltB64();
      const newStretched = await stretchMasterPassword(newPassword, newKdfSalt, PBKDF2_ITERATIONS);
      const { authHashB64: newAuthHash, encKey: newEncKey } = await deriveAuthAndEncKeys(newStretched);
      const { wrappedB64, ivB64 } = await wrapVaultKey(vaultKey, newEncKey);

      const res = await changeMasterPasswordAction({
        oldAuthHash,
        newKdfSalt,
        newKdfIterations: PBKDF2_ITERATIONS,
        newKdfHash: "SHA-256",
        newAuthHash,
        newWrappedVaultKey: wrappedB64,
        newWrappedVaultKeyIv: ivB64,
      });
      if (!res.ok) return res;

      vaultKeyRef.current = vaultKey; // same vault key, items untouched
      return { ok: true };
    },
    []
  );

  const resetVault = useCallback(async (masterPassword: string): Promise<Result> => {
    const statusRes = await getVaultSetupStatusAction();
    if (!statusRes.isSetup) return { ok: false, error: "Vault not set up" };

    const stretched = await stretchMasterPassword(
      masterPassword,
      statusRes.kdfSalt,
      statusRes.kdfIterations
    );
    const { authHashB64 } = await deriveAuthAndEncKeys(stretched);

    const res = await resetVaultAction(authHashB64);
    if (!res.ok) return res;

    vaultKeyRef.current = null;
    setItems([]);
    setFolders([]);
    setStatus("needs-setup");
    return { ok: true };
  }, []);

  const requireVaultKey = (): CryptoKey => {
    if (!vaultKeyRef.current) throw new Error("Vault is locked");
    return vaultKeyRef.current;
  };

  const createItem = useCallback(
    async (payload: VaultItemPayload, folderId: string | null) => {
      const vaultKey = requireVaultKey();
      const { ciphertext, iv } = await encryptItemPayload(vaultKey, payload);
      const res = await createVaultItemAction({ folderId, ciphertext, iv });
      if (res.ok) setItems((prev) => [...prev, { id: res.id, folderId, ...payload }]);
    },
    []
  );

  const updateItem = useCallback(
    async (id: string, payload: VaultItemPayload, folderId: string | null) => {
      const vaultKey = requireVaultKey();
      const { ciphertext, iv } = await encryptItemPayload(vaultKey, payload);
      const res = await updateVaultItemAction({ id, folderId, ciphertext, iv });
      if (res.ok) {
        setItems((prev) => prev.map((it) => (it.id === id ? { id, folderId, ...payload } : it)));
      }
    },
    []
  );

  const deleteItem = useCallback(async (id: string) => {
    const res = await deleteVaultItemAction(id);
    if (res.ok) setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const createFolder = useCallback(async (name: string) => {
    const vaultKey = requireVaultKey();
    const { nameCiphertext, nameIv } = await encryptFolderName(vaultKey, name);
    const res = await createVaultFolderAction({ nameCiphertext, nameIv });
    if (res.ok) setFolders((prev) => [...prev, { id: res.id, name, sortOrder: prev.length }]);
  }, []);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const vaultKey = requireVaultKey();
    const { nameCiphertext, nameIv } = await encryptFolderName(vaultKey, name);
    const res = await updateVaultFolderAction({ id, nameCiphertext, nameIv });
    if (res.ok) setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    const res = await deleteVaultFolderAction(id);
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setItems((prev) => prev.map((it) => (it.folderId === id ? { ...it, folderId: null } : it)));
    }
  }, []);

  return (
    <VaultKeyContext.Provider
      value={{
        status,
        items,
        folders,
        setup,
        unlock,
        lock,
        changeMasterPassword,
        resetVault,
        autoLockMinutes,
        setAutoLockMinutes,
        createItem,
        updateItem,
        deleteItem,
        createFolder,
        renameFolder,
        deleteFolder,
      }}
    >
      {children}
    </VaultKeyContext.Provider>
  );
}
