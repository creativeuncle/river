export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

// Uploaded file/attachment/logo URLs come back from the API as server-relative
// paths (e.g. "/uploads/xyz.png"), which only resolve correctly when the web
// app and API happen to share an origin. When embedded on a third-party site
// (see public/widget.js) — or in any setup where they don't — a bare relative
// path resolves against the wrong origin and 404s. Always route it through
// this before using it as an <img src>, href, etc.
export function resolveAssetUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_BASE}${url}`;
}

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
  closedAt?: string | null;
  rating?: number | null;
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
  proactiveMessageEnabled: boolean;
  proactiveMessageText: string;
  proactiveMessageDelaySeconds: number;
  notifyEmail: string | null;
  emailNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
}

export function fetchWidgetSettings(): Promise<{ settings: WidgetSettings }> {
  return fetch(`${API_BASE}/api/widget/settings`).then((r) => handle(r));
}

export function fetchAgentWidgetSettings(token: string): Promise<{ settings: WidgetSettings; isEmailConfigured: boolean }> {
  return fetch(`${API_BASE}/api/settings/widget`, { headers: agentHeaders(token) }).then((r) => handle(r));
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

// ---- CSAT rating ----

export function submitRating(
  conversationId: string,
  visitorId: string,
  rating: number,
  comment?: string
): Promise<{ conversation: Conversation }> {
  return fetch(`${API_BASE}/api/widget/conversations/${conversationId}/rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, rating, comment }),
  }).then((r) => handle(r));
}

// ---- Reports ----

export interface ReportsSummary {
  rangeDays: number;
  totalConversations: number;
  avgResponseTimeSeconds: number | null;
  avgResolutionTimeSeconds: number | null;
  agentChatCounts: { agentId: string; name: string; count: number }[];
  dailyVolume: { date: string; count: number }[];
  csat: {
    averageRating: number | null;
    totalRatings: number;
    distribution: { star: number; count: number }[];
  };
}

export function fetchReportsSummary(token: string, days = 30): Promise<ReportsSummary> {
  return fetch(`${API_BASE}/api/reports/summary?days=${days}`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

// ---- Archives ----

export interface ArchivedConversation {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: "OPEN" | "CLOSED";
  assignedAgent: { id: string; name: string } | null;
  createdAt: string;
  closedAt: string | null;
  rating: number | null;
  lastMessage: Message | null;
}

export function fetchArchives(
  token: string,
  params: { q?: string; from?: string; to?: string } = {}
): Promise<{ conversations: ArchivedConversation[] }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return fetch(`${API_BASE}/api/conversations/archives?${qs.toString()}`, { headers: agentHeaders(token) }).then((r) =>
    handle(r)
  );
}

export async function downloadArchivesCsv(
  token: string,
  params: { q?: string; from?: string; to?: string } = {}
): Promise<void> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const res = await fetch(`${API_BASE}/api/conversations/archives/export.csv?${qs.toString()}`, {
    headers: agentHeaders(token),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "conversations-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Webhooks ----

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

export function fetchWebhooks(token: string): Promise<{ webhooks: Webhook[]; availableEvents: string[] }> {
  return fetch(`${API_BASE}/api/webhooks`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function createWebhook(token: string, data: { url: string; events: string[] }): Promise<{ webhook: Webhook }> {
  return fetch(`${API_BASE}/api/webhooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

export function updateWebhook(
  token: string,
  id: string,
  data: { url?: string; events?: string[]; enabled?: boolean }
): Promise<{ webhook: Webhook }> {
  return fetch(`${API_BASE}/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...agentHeaders(token) },
    body: JSON.stringify(data),
  }).then((r) => handle(r));
}

export function deleteWebhook(token: string, id: string): Promise<void> {
  return fetch(`${API_BASE}/api/webhooks/${id}`, { method: "DELETE", headers: agentHeaders(token) }).then((r) => {
    if (!r.ok) throw new Error(`Request failed (${r.status})`);
  });
}

// ---- Billing ----

export interface BillingSettings {
  id: string;
  plan: "Free" | "Pro" | "Business";
  seatLimit: number;
}

export function fetchBilling(token: string): Promise<{ billing: BillingSettings; seatCount: number }> {
  return fetch(`${API_BASE}/api/billing`, { headers: agentHeaders(token) }).then((r) => handle(r));
}

export function updateBilling(
  token: string,
  data: { plan?: BillingSettings["plan"]; seatLimit?: number }
): Promise<{ billing: BillingSettings }> {
  return fetch(`${API_BASE}/api/billing`, {
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
