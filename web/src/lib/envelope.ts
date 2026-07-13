import type { EncryptedFileKey } from "./fileCrypto";

// The plaintext payload that gets Signal-encrypted end-to-end. Text and
// file metadata (including the AES key that unlocks the uploaded blob)
// both travel inside this envelope, so the server only ever sees ciphertext.
export type ChatEnvelope =
  | { kind: "text"; text: string }
  | {
      kind: "file";
      fileId: string;
      name: string;
      mimeType: string;
      size: number;
      key: EncryptedFileKey;
    };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeEnvelope(env: ChatEnvelope): ArrayBuffer {
  return encoder.encode(JSON.stringify(env)).buffer as ArrayBuffer;
}

export function decodeEnvelope(buf: ArrayBuffer): ChatEnvelope {
  return JSON.parse(decoder.decode(buf)) as ChatEnvelope;
}
