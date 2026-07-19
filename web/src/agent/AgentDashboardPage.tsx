import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  agentReply,
  assignToMe,
  closeConversation,
  fetchAgents,
  fetchConversation,
  fetchInbox,
  reopenConversation,
  uploadFile,
  type Conversation,
  type InboxConversation,
  type Message,
} from "../lib/api";
import { createSocket } from "../lib/socket";
import { appendMessage } from "../lib/messages";
import { useAgentAuth } from "./AgentAuthContext";
import { Sidebar, type ScopeFilter, type StatusFilter } from "./Sidebar";
import { InboxList } from "./InboxList";
import { ConversationThread } from "./ConversationThread";
import { CustomerInfoPanel, type Note } from "./CustomerInfoPanel";

export function AgentDashboardPage() {
  const { session, logout } = useAgentAuth();
  const socketRef = useRef<Socket | null>(null);

  const [scope, setScope] = useState<ScopeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [notesByConversation, setNotesByConversation] = useState<Record<string, Note[]>>({});

  const refreshInbox = useCallback(() => {
    if (!session) return;
    fetchInbox(session.token).then((r) => setConversations(r.conversations));
  }, [session]);

  useEffect(() => {
    refreshInbox();
    if (session) fetchAgents(session.token).then((r) => setAgents(r.agents));
  }, [refreshInbox, session]);

  useEffect(() => {
    if (!session) return;
    const socket = createSocket(session.token);
    socketRef.current = socket;

    socket.on("conversation:new", refreshInbox);
    socket.on("conversation:updated", refreshInbox);

    socket.on("message:new", (m: Message) => {
      setSelected((prev) => {
        if (prev && m.conversationId === prev.id) {
          setMessages((prevMsgs) => appendMessage(prevMsgs, m));
        }
        return prev;
      });
    });

    socket.on("typing", ({ conversationId, from }: { conversationId: string; from: string }) => {
      setSelected((prev) => {
        if (prev && prev.id === conversationId && from === "customer") {
          setVisitorTyping(true);
          setTimeout(() => setVisitorTyping(false), 2500);
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [session, refreshInbox]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (status !== "ALL" && c.status !== status) return false;
      if (scope === "mine" && c.assignedAgentId !== session?.agentId) return false;
      if (scope === "unassigned" && c.assignedAgentId) return false;
      return true;
    });
  }, [conversations, scope, status, session?.agentId]);

  const listTitle = scope === "mine" ? "Assigned to me" : scope === "unassigned" ? "Unassigned" : "All conversations";

  async function selectConversation(id: string) {
    if (!session) return;
    const { conversation } = await fetchConversation(session.token, id);
    setSelected(conversation);
    setMessages(conversation.messages ?? []);
    socketRef.current?.emit("conversation:join", { conversationId: id });
    refreshInbox();
  }

  async function onSend(text: string) {
    if (!session || !selected) return;
    const { message } = await agentReply(session.token, selected.id, text);
    setMessages((prev) => appendMessage(prev, message));
  }

  async function onSendFile(file: File) {
    if (!session || !selected) return;
    const { url, name } = await uploadFile(file, file.name);
    const { message } = await agentReply(session.token, selected.id, "", { url, name });
    setMessages((prev) => appendMessage(prev, message));
  }

  function onTyping() {
    if (!selected) return;
    socketRef.current?.emit("typing", { conversationId: selected.id, from: "agent" });
  }

  async function onAssignToMe() {
    if (!session || !selected) return;
    const { conversation } = await assignToMe(session.token, selected.id);
    setSelected(conversation);
    refreshInbox();
  }

  async function onToggleStatus() {
    if (!session || !selected) return;
    const { conversation } =
      selected.status === "OPEN"
        ? await closeConversation(session.token, selected.id)
        : await reopenConversation(session.token, selected.id);
    setSelected(conversation);
    refreshInbox();
  }

  function onAddNote(text: string) {
    if (!session || !selected) return;
    const note: Note = { id: crypto.randomUUID(), author: session.name, text, createdAt: new Date().toISOString() };
    setNotesByConversation((prev) => ({ ...prev, [selected.id]: [note, ...(prev[selected.id] ?? [])] }));
  }

  if (!session) return null;

  return (
    <div className="agent-dashboard">
      <Sidebar
        conversations={conversations}
        agents={agents}
        currentAgentId={session.agentId}
        currentAgentName={session.name}
        scope={scope}
        status={status}
        onScopeChange={setScope}
        onStatusChange={setStatus}
        onLogout={logout}
      />

      <InboxList
        title={listTitle}
        conversations={filteredConversations}
        selectedId={selected?.id ?? null}
        onSelect={selectConversation}
      />

      {selected ? (
        <>
          <ConversationThread
            conversation={selected}
            messages={messages}
            onSend={onSend}
            onSendFile={onSendFile}
            onTyping={onTyping}
            onAssignToMe={onAssignToMe}
            onToggleStatus={onToggleStatus}
            visitorTyping={visitorTyping}
          />
          <CustomerInfoPanel
            conversation={selected}
            notes={notesByConversation[selected.id] ?? []}
            onAddNote={onAddNote}
          />
        </>
      ) : (
        <div className="conversation-thread empty-state">
          <p className="muted">Select a conversation from the inbox.</p>
        </div>
      )}
    </div>
  );
}
