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
  isAutomated: boolean;
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
  agent: { id: string; name: string; email: string; title?: string | null; role?: string };
}

export function agentRegister(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<AgentAuthResponse> {
  return fetch(`${API_BASE}/api/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone: phone || undefined }),
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

export interface Agent {
  id: string;
  name: string;
  email: string;
  title: string | null;
  phone: string | null;
  role: string;
  groupId: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export function fetchAgents(token: string): Promise<{ agents: Agent[]; onlineAgentIds: string[] }> {
  return fetch(`${API_BASE}/api/agents`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function createAgent(
  token: string,
  data: { name: string; email: string; password: string; title?: string }
): Promise<{ agent: Agent }> {
  return fetch(`${API_BASE}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

export function updateAgent(
  token: string,
  id: string,
  data: { name?: string; title?: string | null; role?: string; groupId?: string | null }
): Promise<{ agent: Agent }> {
  return fetch(`${API_BASE}/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

export async function deleteAgent(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/agents/${id}`, { method: "DELETE", headers: agentHeaders(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
}

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

// ---- Groups ----

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  agents: { id: string; name: string }[];
}

export function fetchGroups(token: string): Promise<{ groups: Group[] }> {
  return fetch(`${API_BASE}/api/groups`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function createGroup(token: string, name: string): Promise<{ group: Group }> {
  return fetch(`${API_BASE}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify({ name }),
  }).then((r) => handle(r));
}

export async function deleteGroup(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, { method: "DELETE", headers: agentHeaders(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
}

// ---- Canned replies ----

export interface CannedReply {
  id: string;
  shortcut: string;
  title: string;
  text: string;
  createdAt: string;
}

export function fetchCannedReplies(token: string): Promise<{ cannedReplies: CannedReply[] }> {
  return fetch(`${API_BASE}/api/canned-replies`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function createCannedReply(
  token: string,
  data: { shortcut: string; title: string; text: string }
): Promise<{ cannedReply: CannedReply }> {
  return fetch(`${API_BASE}/api/canned-replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

export function updateCannedReply(
  token: string,
  id: string,
  data: { shortcut?: string; title?: string; text?: string }
): Promise<{ cannedReply: CannedReply }> {
  return fetch(`${API_BASE}/api/canned-replies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

export async function deleteCannedReply(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/canned-replies/${id}`, { method: "DELETE", headers: agentHeaders(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
}

// ---- Widget settings ----

export interface WidgetSettings {
  id: string;
  companyName: string;
  primaryColor: string;
  position: "left" | "right";
  welcomeMessage: string;
  awayMessage: string;
  logoUrl: string | null;
}

export function fetchWidgetSettings(): Promise<{ settings: WidgetSettings }> {
  return fetch(`${API_BASE}/api/widget/settings`).then((r) => handle(r));
}

export function updateWidgetSettings(
  token: string,
  data: Partial<Omit<WidgetSettings, "id">>
): Promise<{ settings: WidgetSettings }> {
  return fetch(`${API_BASE}/api/settings/widget`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

// ---- Conversation notes ----

export interface ConversationNote {
  id: string;
  conversationId: string;
  agentId: string;
  agent: { id: string; name: string };
  text: string;
  mentionedAgentIds: string[];
  createdAt: string;
}

export function fetchNotes(token: string, conversationId: string): Promise<{ notes: ConversationNote[] }> {
  return fetch(`${API_BASE}/api/conversations/${conversationId}/notes`, { headers: agentHeaders(token) }).then((r) =>
    handle(r)
  );
}

export function addNote(token: string, conversationId: string, text: string): Promise<{ note: ConversationNote }> {
  return fetch(`${API_BASE}/api/conversations/${conversationId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify({ text }),
  }).then((r) => handle(r));
}
