import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  type DeviceType,
} from "@privacyresearch/libsignal-protocol-typescript";
import { IndexedDbSignalStore } from "./signalStore";
import { bufToBase64, base64ToBuf } from "./base64";

const DEVICE_ID = 1; // single-device for now; multi-device is a future extension
const PREKEY_BATCH_SIZE = 20;
const SIGNED_PREKEY_ID = 1;

export interface RegistrationBundle {
  registrationId: number;
  identityPublicKey: string;
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  preKeys: { keyId: number; publicKey: string }[];
}

export interface RemoteKeyBundle {
  userId: string;
  registrationId: number;
  identityPublicKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  preKey: { keyId: number; publicKey: string } | null;
}

// Generates a fresh Signal identity for a brand-new account: an identity
// keypair, a registration id, one signed prekey, and a batch of one-time
// prekeys. Private key material is written straight to IndexedDB via the
// store; only the returned public bundle should ever be sent to the server.
export async function generateRegistrationBundle(store: IndexedDbSignalStore): Promise<RegistrationBundle> {
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = KeyHelper.generateRegistrationId();
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, SIGNED_PREKEY_ID);

  await store.setIdentityKeyPair(identityKeyPair);
  await store.setLocalRegistrationId(registrationId);
  await store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

  const preKeys = await generatePreKeyBatch(store, 1);

  return {
    registrationId,
    identityPublicKey: bufToBase64(identityKeyPair.pubKey),
    signedPreKeyId: signedPreKey.keyId,
    signedPreKeyPublic: bufToBase64(signedPreKey.keyPair.pubKey),
    signedPreKeySignature: bufToBase64(signedPreKey.signature),
    preKeys,
  };
}

export async function generatePreKeyBatch(
  store: IndexedDbSignalStore,
  startId: number
): Promise<{ keyId: number; publicKey: string }[]> {
  const result: { keyId: number; publicKey: string }[] = [];
  for (let i = 0; i < PREKEY_BATCH_SIZE; i++) {
    const keyId = startId + i;
    const preKey = await KeyHelper.generatePreKey(keyId);
    await store.storePreKey(preKey.keyId, preKey.keyPair);
    result.push({ keyId: preKey.keyId, publicKey: bufToBase64(preKey.keyPair.pubKey) });
  }
  return result;
}

function addressFor(username: string): SignalProtocolAddress {
  return new SignalProtocolAddress(username, DEVICE_ID);
}

// Establishes (or reuses) a Signal session with `remoteUsername` and
// encrypts `plaintext`. `getBundle` is only called (hitting the server) when
// no session exists yet — an already-open session is reused as-is.
export async function encryptFor(
  store: IndexedDbSignalStore,
  remoteUsername: string,
  getBundle: () => Promise<RemoteKeyBundle>,
  plaintext: ArrayBuffer
): Promise<{ cipherType: number; ciphertext: string }> {
  const address = addressFor(remoteUsername);
  const cipher = new SessionCipher(store, address);

  if (!(await cipher.hasOpenSession())) {
    const bundle = await getBundle();
    const device: DeviceType = {
      identityKey: base64ToBuf(bundle.identityPublicKey),
      registrationId: bundle.registrationId,
      signedPreKey: {
        keyId: bundle.signedPreKey.keyId,
        publicKey: base64ToBuf(bundle.signedPreKey.publicKey),
        signature: base64ToBuf(bundle.signedPreKey.signature),
      },
      preKey: bundle.preKey
        ? { keyId: bundle.preKey.keyId, publicKey: base64ToBuf(bundle.preKey.publicKey) }
        : undefined,
    };
    const builder = new SessionBuilder(store, address);
    await builder.processPreKey(device);
  }

  const result = await cipher.encrypt(plaintext);
  // The library's wire format is a "binary string" (one char per byte), which
  // happens to be exactly what btoa() expects, so this is a direct base64 encode.
  const ciphertext = btoa(result.body as unknown as string);
  return { cipherType: result.type, ciphertext };
}

// Decrypts an incoming envelope. cipherType 3 = PreKeyWhisperMessage (first
// message of a new session), 1 = WhisperMessage (an ongoing session).
export async function decryptFrom(
  store: IndexedDbSignalStore,
  remoteUsername: string,
  cipherType: number,
  ciphertext: string
): Promise<ArrayBuffer> {
  const address = addressFor(remoteUsername);
  const cipher = new SessionCipher(store, address);
  const binaryString = atob(ciphertext);

  if (cipherType === 3) {
    return cipher.decryptPreKeyWhisperMessage(binaryString);
  }
  return cipher.decryptWhisperMessage(binaryString);
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeText(text: string): ArrayBuffer {
  return textEncoder.encode(text).buffer as ArrayBuffer;
}

export function decodeText(buf: ArrayBuffer): string {
  return textDecoder.decode(buf);
}
