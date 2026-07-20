import { bufToBase64, base64ToBuf } from "./encoding";

export async function aesGcmEncryptString(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { ciphertext: bufToBase64(ct), iv: bufToBase64(iv) };
}

export async function aesGcmDecryptString(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuf(iv) },
    key,
    base64ToBuf(ciphertext)
  );
  return new TextDecoder().decode(pt);
}
