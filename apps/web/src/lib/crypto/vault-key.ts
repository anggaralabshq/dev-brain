import { bufToBase64, base64ToBuf } from "./encoding";

/** Random 256-bit AES key — the actual data-encryption key for items/folders. */
export async function generateVaultKey(): Promise<CryptoKey> {
  // extractable:true so it can be exported+wrapped once at setup/rotation time.
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  encKey: CryptoKey
): Promise<{ wrappedB64: string; ivB64: string }> {
  const raw = await crypto.subtle.exportKey("raw", vaultKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encKey, raw);
  return { wrappedB64: bufToBase64(wrapped), ivB64: bufToBase64(iv) };
}

/**
 * Unwraps the vault key using encKey. Throws if encKey is wrong (wrong master
 * password) — this is the local "is my password right" confirmation, on top
 * of the server's authHash check. Imported as non-extractable in memory.
 */
export async function unwrapVaultKey(
  wrappedB64: string,
  ivB64: string,
  encKey: CryptoKey
): Promise<CryptoKey> {
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuf(ivB64) },
    encKey,
    base64ToBuf(wrappedB64)
  );
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
