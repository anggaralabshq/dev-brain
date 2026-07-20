import { bufToBase64, base64ToBuf } from "./encoding";

// OWASP-2023-recommended floor for PBKDF2-HMAC-SHA256 — defends a DB dump,
// not a GPU farm, which matches VaultKey's personal/single-tenant threat model.
export const PBKDF2_ITERATIONS = 600_000;
export const PBKDF2_HASH = "SHA-256";

export function generateSaltB64(): string {
  return bufToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/** Master password + salt -> stretched key bits. Never transmitted. */
export async function stretchMasterPassword(
  masterPassword: string,
  saltB64: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<ArrayBuffer> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: PBKDF2_HASH, salt: base64ToBuf(saltB64), iterations },
    passwordKey,
    256
  );
}

/**
 * HKDF-expand the stretched bits into two cryptographically independent outputs:
 * an auth hash (sent to the server, cannot decrypt anything) and an encryption
 * key (never leaves the browser). Independence is a standard property of
 * HKDF-Expand under distinct `info` labels, assuming HMAC-SHA256 is a PRF.
 */
export async function deriveAuthAndEncKeys(
  stretchedBits: ArrayBuffer
): Promise<{ authHashB64: string; encKey: CryptoKey }> {
  const hkdfKey = await crypto.subtle.importKey("raw", stretchedBits, "HKDF", false, [
    "deriveBits",
    "deriveKey",
  ]);

  const authBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode("vaultkey-auth-v1"),
    },
    hkdfKey,
    256
  );

  const encKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode("vaultkey-enc-v1"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable — cannot be exported/leaked
    ["encrypt", "decrypt"]
  );

  return { authHashB64: bufToBase64(authBits), encKey };
}
