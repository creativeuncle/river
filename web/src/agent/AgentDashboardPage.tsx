import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  agentReply,
  assignToMe,
  closeConversation,
  fetchConversation,
  fetchInbox,
  reopenConversation,
  type Conversation,
  type InboxConversation,
  type Message,
} from "../lib/api";
import { createSocket } from "../lib/socket";
import { appendMessage } from "../lib/messages";
import { useAgentAuth } from "./AgentAuthContext";
import { InboxList } from "./InboxList";
import { ConversationThread } from "./ConversationThread";
import { CustomerInfoPanel } from "./CustomerInfoPanel";

export function AgentDashboardPage() {
  const { session, logout } = useAgentAuth();
  const socketRef = useRef<Socket | null>(null);

  const [statusFilter, setStatusFilter] = useState<"OPEN" | "CLOSED">("OPEN");
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorTyping, setVisitorTyping] = useState(false);

  const refreshInbox = useCallback(() => {
    if (!session) return;
    fetchInbox(session.token, statusFilter).then((r) => setConversations(r.conversations));
  }, [session, statusFilter]);

  useEffect(() => {
    refreshInbox();
  }, [refreshInbox]);

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

  if (!session) return null;

  return (
    <div className="agent-dashboard">
      <nav className="icon-rail">
        <button
          className={statusFilter === "OPEN" ? "active" : ""}
          title="Open conversations"
          onClick={() => setStatusFilter("OPEN")}
        >
          💬
        </button>
        <button
          className={statusFilter === "CLOSED" ? "active" : ""}
          title="Closed conversations"
          onClick={() => setStatusFilter("CLOSED")}
        >
          ✅
        </button>
        <div style={{ flex: 1 }} />
        <button title={session.name} onClick={logout}>
          🚪
        </button>
      </nav>

      <InboxList conversations={conversations} selectedId={selected?.id ?? null} onSelect={selectConversation} />

      {selected ? (
        <>
          <ConversationThread
            conversation={selected}
            messages={messages}
            onSend={onSend}
            onTyping={onTyping}
            visitorTyping={visitorTyping}
          />
          <CustomerInfoPanel conversation={selected} onAssignToMe={onAssignToMe} onToggleStatus={onToggleStatus} />
        </>
      ) : (
        <div className="conversation-thread empty-state">
          <p className="muted">Select a conversation from the inbox.</p>
        </div>
      )}
    </div>
  );
}
