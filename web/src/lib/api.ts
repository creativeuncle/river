export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface RegisterRequest {
  username: string;
  password: string;
  registrationId: number;
  identityPublicKey: string;
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  preKeys: { keyId: number; publicKey: string }[];
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string };
}

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => handle<AuthResponse>(r));
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then((r) => handle<AuthResponse>(r));
}

export function searchUsers(token: string, q: string): Promise<{ users: { id: string; username: string }[] }> {
  return fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(token),
  }).then((r) => handle(r));
}

export function fetchUserByUsername(token: string, username: string): Promise<{ user: { id: string; username: string } }> {
  return fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, {
    headers: authHeaders(token),
  }).then((r) => handle(r));
}

export interface RemoteKeyBundleResponse {
  userId: string;
  registrationId: number;
  identityPublicKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  preKey: { keyId: number; publicKey: string } | null;
}

export function fetchKeyBundle(token: string, username: string): Promise<RemoteKeyBundleResponse> {
  return fetch(`${API_BASE}/api/keys/${encodeURIComponent(username)}`, {
    headers: authHeaders(token),
  }).then((r) => handle(r));
}

export function topUpPreKeys(token: string, preKeys: { keyId: number; publicKey: string }[]): Promise<void> {
  return fetch(`${API_BASE}/api/keys/prekeys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ preKeys }),
  }).then((r) => handle(r));
}

export function preKeyCount(token: string): Promise<{ count: number }> {
  return fetch(`${API_BASE}/api/keys/prekeys/count`, { headers: authHeaders(token) }).then((r) => handle(r));
}

export interface WireMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  cipherType: number;
  ciphertext: string;
  createdAt: string;
}

export function sendMessage(
  token: string,
  recipientUsername: string,
  cipherType: number,
  ciphertext: string
): Promise<{ id: string; conversationId: string; delivered: boolean }> {
  return fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ recipientUsername, cipherType, ciphertext }),
  }).then((r) => handle(r));
}

export function fetchConversationMessages(
  token: string,
  conversationId: string
): Promise<{ messages: WireMessage[] }> {
  return fetch(`${API_BASE}/api/messages/conversations/${encodeURIComponent(conversationId)}`, {
    headers: authHeaders(token),
  }).then((r) => handle(r));
}

export function fetchConversations(
  token: string
): Promise<{ conversations: { conversationId: string; lastMessageAt: string; otherUsername: string | null }[] }> {
  return fetch(`${API_BASE}/api/messages/conversations`, { headers: authHeaders(token) }).then((r) => handle(r));
}

export async function uploadEncryptedFile(
  token: string,
  conversationId: string,
  blob: Blob
): Promise<{ id: string; sizeBytes: number }> {
  const form = new FormData();
  form.append("conversationId", conversationId);
  form.append("file", blob);
  const res = await fetch(`${API_BASE}/api/files`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  return handle(res);
}

export async function downloadEncryptedFile(token: string, fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(fileId)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return res.arrayBuffer();
}
