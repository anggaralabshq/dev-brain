import { aesGcmEncryptString, aesGcmDecryptString } from "./aes";

export type VaultItemPayload = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

export async function encryptItemPayload(vaultKey: CryptoKey, payload: VaultItemPayload) {
  return aesGcmEncryptString(vaultKey, JSON.stringify({ ...payload, v: 1 }));
}

export async function decryptItemPayload(
  vaultKey: CryptoKey,
  row: { ciphertext: string; iv: string }
): Promise<VaultItemPayload> {
  const json = await aesGcmDecryptString(vaultKey, row.ciphertext, row.iv);
  const parsed = JSON.parse(json);
  return {
    title: parsed.title ?? "",
    username: parsed.username ?? "",
    password: parsed.password ?? "",
    url: parsed.url ?? "",
    notes: parsed.notes ?? "",
  };
}

export async function encryptFolderName(vaultKey: CryptoKey, name: string) {
  const r = await aesGcmEncryptString(vaultKey, name);
  return { nameCiphertext: r.ciphertext, nameIv: r.iv };
}

export async function decryptFolderName(
  vaultKey: CryptoKey,
  row: { nameCiphertext: string; nameIv: string }
): Promise<string> {
  return aesGcmDecryptString(vaultKey, row.nameCiphertext, row.nameIv);
}
