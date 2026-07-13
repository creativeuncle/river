import { openDB, type IDBPDatabase } from "idb";
import type { Direction, KeyPairType, StorageType } from "@privacyresearch/libsignal-protocol-typescript";
import { bufToBase64, base64ToBuf } from "./base64";

// Everything in this store lives only in the browser's IndexedDB. Private
// keys and session state never leave the device — the server only ever
// receives the public halves generated once at registration time.
const DB_NAME_PREFIX = "river-signal-store";
const DB_VERSION = 1;

interface StoredKeyPair {
  pubKey: string;
  privKey: string;
}

function toStored(kp: KeyPairType): StoredKeyPair {
  return { pubKey: bufToBase64(kp.pubKey), privKey: bufToBase64(kp.privKey) };
}

function fromStored(kp: StoredKeyPair): KeyPairType {
  return { pubKey: base64ToBuf(kp.pubKey), privKey: base64ToBuf(kp.privKey) };
}

async function openStoreDb(username: string): Promise<IDBPDatabase> {
  return openDB(`${DB_NAME_PREFIX}:${username}`, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("kv");
      db.createObjectStore("preKeys");
      db.createObjectStore("signedPreKeys");
      db.createObjectStore("sessions");
      db.createObjectStore("identities");
    },
  });
}

// Implements the StorageType contract expected by SessionBuilder/SessionCipher.
export class IndexedDbSignalStore implements StorageType {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(username: string) {
    this.dbPromise = openStoreDb(username);
  }

  private async db() {
    return this.dbPromise;
  }

  async setIdentityKeyPair(kp: KeyPairType): Promise<void> {
    const db = await this.db();
    await db.put("kv", toStored(kp), "identityKeyPair");
  }

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const db = await this.db();
    const stored = (await db.get("kv", "identityKeyPair")) as StoredKeyPair | undefined;
    return stored ? fromStored(stored) : undefined;
  }

  async setLocalRegistrationId(id: number): Promise<void> {
    const db = await this.db();
    await db.put("kv", id, "registrationId");
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const db = await this.db();
    return (await db.get("kv", "registrationId")) as number | undefined;
  }

  // Trust-on-first-use: the first identity key seen for a contact is
  // trusted and pinned; a later change (e.g. re-install without backup,
  // or a MITM) is a real event a production build should surface to the
  // user for verification instead of silently accepting.
  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, _direction: Direction): Promise<boolean> {
    const db = await this.db();
    const existing = (await db.get("identities", identifier)) as string | undefined;
    if (!existing) return true;
    return existing === bufToBase64(identityKey);
  }

  async saveIdentity(encodedAddress: string, publicKey: ArrayBuffer): Promise<boolean> {
    const db = await this.db();
    const existing = (await db.get("identities", encodedAddress)) as string | undefined;
    const encoded = bufToBase64(publicKey);
    await db.put("identities", encoded, encodedAddress);
    return existing !== undefined && existing !== encoded;
  }

  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const db = await this.db();
    const stored = (await db.get("preKeys", String(keyId))) as StoredKeyPair | undefined;
    return stored ? fromStored(stored) : undefined;
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    const db = await this.db();
    await db.put("preKeys", toStored(keyPair), String(keyId));
  }

  async removePreKey(keyId: string | number): Promise<void> {
    const db = await this.db();
    await db.delete("preKeys", String(keyId));
  }

  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const db = await this.db();
    const stored = (await db.get("signedPreKeys", String(keyId))) as StoredKeyPair | undefined;
    return stored ? fromStored(stored) : undefined;
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    const db = await this.db();
    await db.put("signedPreKeys", toStored(keyPair), String(keyId));
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    const db = await this.db();
    await db.delete("signedPreKeys", String(keyId));
  }

  async storeSession(encodedAddress: string, record: string): Promise<void> {
    const db = await this.db();
    await db.put("sessions", record, encodedAddress);
  }

  async loadSession(encodedAddress: string): Promise<string | undefined> {
    const db = await this.db();
    return (await db.get("sessions", encodedAddress)) as string | undefined;
  }
}
