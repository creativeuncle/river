import { bufToBase64, base64ToBuf } from "./base64";

// Every file gets a fresh random AES-256-GCM key. The key+iv only ever
// travels inside a Signal-encrypted chat message (see FileEnvelope below) —
// the server stores nothing but AES ciphertext bytes it cannot decrypt.
export interface EncryptedFileKey {
  keyRaw: string; // base64
  iv: string; // base64
}

export async function encryptFile(file: File): Promise<{ blob: Blob; key: EncryptedFileKey }> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const rawKey = await crypto.subtle.exportKey("raw", key);

  return {
    blob: new Blob([ciphertext], { type: "application/octet-stream" }),
    key: { keyRaw: bufToBase64(rawKey), iv: bufToBase64(iv.buffer) },
  };
}

export async function decryptFile(ciphertext: ArrayBuffer, key: EncryptedFileKey): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", base64ToBuf(key.keyRaw), "AES-GCM", false, ["decrypt"]);
  const iv = new Uint8Array(base64ToBuf(key.iv));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
}
