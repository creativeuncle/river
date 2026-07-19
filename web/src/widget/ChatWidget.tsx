import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Socket } from "socket.io-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Attachment01Icon, SentIcon } from "@hugeicons/core-free-icons";
import {
  fetchMyConversation,
  fetchVisitorMessages,
  sendVisitorMessage,
  startConversation,
  uploadFile,
  type Conversation,
  type Message,
} from "../lib/api";
import { createSocket } from "../lib/socket";
import { getVisitorId } from "../lib/visitor";
import { appendMessage } from "../lib/messages";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(getVisitorId());

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    socket.on("message:new", (m: Message) => {
      setConversation((prev) => {
        if (prev && m.conversationId === prev.id) {
          setMessages((prevMsgs) => appendMessage(prevMsgs, m));
        }
        return prev;
      });
    });
    socket.on("typing", ({ from }: { from: string }) => {
      if (from === "agent") {
        setAgentTyping(true);
        setTimeout(() => setAgentTyping(false), 2500);
      }
    });
    socket.on("conversation:closed", () => {
      setConversation((prev) => (prev ? { ...prev, status: "CLOSED" } : prev));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open || conversation) return;
    fetchMyConversation(visitorId.current).then(async (r) => {
      if (r.conversation) {
        setConversation(r.conversation);
        const msgs = await fetchVisitorMessages(r.conversation.id, visitorId.current);
        setMessages(msgs.messages);
        socketRef.current?.emit("conversation:join", { conversationId: r.conversation.id, visitorId: visitorId.current });
      }
    });
  }, [open, conversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await send(text.trim());
    setText("");
  }

  async function send(body: string, attachment?: { url: string; name: string }) {
    setSending(true);
    try {
      if (!conversation) {
        const { conversation: created } = await startConversation(visitorId.current, body || attachment!.name);
        setConversation(created);
        setMessages(created.messages ?? []);
        socketRef.current?.emit("conversation:join", { conversationId: created.id, visitorId: visitorId.current });
      } else {
        const { message } = await sendVisitorMessage(conversation.id, visitorId.current, body, attachment);
        setMessages((prev) => appendMessage(prev, message));
      }
    } finally {
      setSending(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSending(true);
    try {
      const { url, name } = await uploadFile(file, file.name);
      await send("", { url, name });
    } finally {
      setSending(false);
    }
  }

  function onTyping() {
    if (conversation) socketRef.current?.emit("typing", { conversationId: conversation.id, from: "customer" });
  }

  if (!open) {
    return (
      <button className="widget-bubble" onClick={() => setOpen(true)} aria-label="Open chat">
        💬
      </button>
    );
  }

  return (
    <div className="widget-panel">
      <header>
        <div className="widget-avatar">🎧</div>
        <div className="widget-header-text">
          <span className="agent-name">Support Agent</span>
          <span className="online-dot">
            <i /> online
          </span>
        </div>
        <button className="widget-close" onClick={() => setOpen(false)} aria-label="Close chat">
          ✕
        </button>
      </header>

      <div className="messages">
        {messages.length === 0 && <p className="muted widget-welcome">Hi! How can we help?</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.senderType === "CUSTOMER" ? "mine" : "theirs"}`}>
            {m.text && <p>{m.text}</p>}
            {m.attachmentUrl && (
              <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="file-chip">
                📎 {m.attachmentName ?? "attachment"}
              </a>
            )}
            <time>{new Date(m.createdAt).toLocaleTimeString()}</time>
          </div>
        ))}
        {agentTyping && <p className="muted typing-indicator">Agent is typing…</p>}
        <div ref={bottomRef} />
      </div>

      {conversation?.status === "CLOSED" ? (
        <p className="muted widget-closed-note">This conversation has been closed.</p>
      ) : (
        <form className="composer" onSubmit={onSubmit}>
          <div className="composer-row">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={onPickFile}
              accept="image/*,video/*,.zip,.pdf,.psd,.ai,.eps,.svg"
            />
            <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()} disabled={sending}>
              <HugeiconsIcon icon={Attachment01Icon} size={17} />
            </button>
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onTyping();
              }}
              placeholder="Type a message…"
              disabled={sending}
            />
            <button type="submit" className="send-btn" disabled={sending || !text.trim()}>
              <HugeiconsIcon icon={SentIcon} size={14} />
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
