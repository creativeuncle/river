export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function agentHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export type SenderType = "CUSTOMER" | "AGENT";

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  agentId: string | null;
  text: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  readByAgent: boolean;
  readByVisitor: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: "OPEN" | "CLOSED";
  assignedAgentId?: string | null;
  assignedAgent: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt: string;
  messages?: Message[];
}

export interface InboxConversation extends Conversation {
  lastMessage: Message | null;
  unreadCount: number;
}

// ---- Agent auth ----

export interface AgentAuthResponse {
  token: string;
  agent: { id: string; name: string; email: string };
}

export function agentRegister(name: string, email: string, password: string): Promise<AgentAuthResponse> {
  return fetch(`${API_BASE}/api/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  }).then((r) => handle(r));
}

export function agentLogin(email: string, password: string): Promise<AgentAuthResponse> {
  return fetch(`${API_BASE}/api/agents/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => handle(r));
}

// ---- Agent dashboard ----

export function fetchInbox(token: string, status?: "OPEN" | "CLOSED"): Promise<{ conversations: InboxConversation[] }> {
  const qs = status ? `?status=${status}` : "";
  return fetch(`${API_BASE}/api/conversations${qs}`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function fetchConversation(token: string, id: string): Promise<{ conversation: Conversation }> {
  return fetch(`${API_BASE}/api/conversations/${id}`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function agentReply(
  token: string,
  conversationId: string,
  text: string,
  attachment?: { url: string; name: string }
): Promise<{ message: Message }> {
  return fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify({ text, attachmentUrl: attachment?.url, attachmentName: attachment?.name }),
  }).then((r) => handle(r));
}

export function assignToMe(token: string, conversationId: string): Promise<{ conversation: Conversation }> {
  return fetch(`${API_BASE}/api/conversations/${conversationId}/assign`, {
    method: "POST",
    headers: agentHeaders(token),
  }).then((r) => handle(r));
}

export function closeConversation(token: string, conversationId: string): Promise<{ conversation: Conversation }> {
  return fetch(`${API_BASE}/api/conversations/${conversationId}/close`, {
    method: "POST",
    headers: agentHeaders(token),
  }).then((r) => handle(r));
}

export function reopenConversation(token: string, conversationId: string): Promise<{ conversation: Conversation }> {
  return fetch(`${API_BASE}/api/conversations/${conversationId}/reopen`, {
    method: "POST",
    headers: agentHeaders(token),
  }).then((r) => handle(r));
}

// ---- Widget (anonymous visitor) ----

export function fetchMyConversation(visitorId: string): Promise<{ conversation: Conversation | null }> {
  return fetch(`${API_BASE}/api/widget/conversations/mine?visitorId=${encodeURIComponent(visitorId)}`).then((r) =>
    handle(r)
  );
}

export function startConversation(
  visitorId: string,
  text: string,
  visitorName?: string,
  visitorEmail?: string
): Promise<{ conversation: Conversation }> {
  return fetch(`${API_BASE}/api/widget/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, text, visitorName, visitorEmail }),
  }).then((r) => handle(r));
}

export function sendVisitorMessage(
  conversationId: string,
  visitorId: string,
  text: string,
  attachment?: { url: string; name: string }
): Promise<{ message: Message }> {
  return fetch(`${API_BASE}/api/widget/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, text, attachmentUrl: attachment?.url, attachmentName: attachment?.name }),
  }).then((r) => handle(r));
}

export function fetchVisitorMessages(conversationId: string, visitorId: string): Promise<{ messages: Message[] }> {
  return fetch(
    `${API_BASE}/api/widget/conversations/${conversationId}/messages?visitorId=${encodeURIComponent(visitorId)}`
  ).then((r) => handle(r));
}

// ---- Uploads (shared) ----

export async function uploadFile(file: Blob, filename: string): Promise<{ url: string; name: string }> {
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetch(`${API_BASE}/api/uploads`, { method: "POST", body: form });
  return handle(res);
}
