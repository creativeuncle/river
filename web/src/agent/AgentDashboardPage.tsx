import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  agentReply,
  assignToMe,
  closeConversation,
  fetchConversation,
  reopenConversation,
  uploadFile,
  type Conversation,
  type Message,
} from "../lib/api";
import { appendMessage } from "../lib/messages";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";
import { InboxList } from "./InboxList";
import { ConversationThread } from "./ConversationThread";
import { CustomerInfoPanel } from "./CustomerInfoPanel";

export function AgentDashboardPage() {
  const { session } = useAgentAuth();
  const { socket, conversations, refreshInbox, scope, status, cannedReplies, refreshCannedReplies } =
    useOutletContext<AgentOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorTyping, setVisitorTyping] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (m: Message) => {
      setSelected((prev) => {
        if (prev && m.conversationId === prev.id) {
          setMessages((prevMsgs) => appendMessage(prevMsgs, m));
        }
        return prev;
      });
    };

    const onTypingEvent = ({ conversationId, from }: { conversationId: string; from: string }) => {
      setSelected((prev) => {
        if (prev && prev.id === conversationId && from === "customer") {
          setVisitorTyping(true);
          setTimeout(() => setVisitorTyping(false), 2500);
        }
        return prev;
      });
    };

    socket.on("message:new", onMessage);
    socket.on("typing", onTypingEvent);
    return () => {
      socket.off("message:new", onMessage);
      socket.off("typing", onTypingEvent);
    };
  }, [socket]);

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
    socket?.emit("conversation:join", { conversationId: id });
    refreshInbox();
  }

  // Deep-link support: the top bar search and mention toasts navigate to
  // /agent?open=<id> to jump straight into a conversation.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    selectConversation(openId);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    socket?.emit("typing", { conversationId: selected.id, from: "agent" });
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
    <div className="dashboard-columns">
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
            cannedReplies={cannedReplies}
            onSend={onSend}
            onSendFile={onSendFile}
            onTyping={onTyping}
            onAssignToMe={onAssignToMe}
            onToggleStatus={onToggleStatus}
            onCannedRepliesChanged={refreshCannedReplies}
            visitorTyping={visitorTyping}
          />
          <CustomerInfoPanel conversation={selected} />
        </>
      ) : (
        <div className="conversation-thread empty-state">
          <p className="muted">Select a conversation from the inbox.</p>
        </div>
      )}
    </div>
  );
}
