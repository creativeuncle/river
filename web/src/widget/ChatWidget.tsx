import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Socket } from "socket.io-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Attachment01Icon, SentIcon } from "@hugeicons/core-free-icons";
import {
  fetchMyConversation,
  fetchVisitorMessages,
  fetchWidgetSettings,
  sendVisitorMessage,
  startConversation,
  uploadFile,
  type Conversation,
  type Message,
  type WidgetSettings,
} from "../lib/api";
import { createSocket } from "../lib/socket";
import { getVisitorId, getVisitorProfile, saveVisitorProfile } from "../lib/visitor";
import { appendMessage } from "../lib/messages";
import { isImageAttachment } from "../lib/attachments";
import { EmojiPicker } from "../components/EmojiPicker";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [profile, setProfile] = useState(getVisitorProfile());
  const [preChatName, setPreChatName] = useState("");
  const [preChatEmail, setPreChatEmail] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(getVisitorId());

  useEffect(() => {
    fetchWidgetSettings().then((r) => setSettings(r.settings));
  }, []);

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
        const { conversation: created } = await startConversation(
          visitorId.current,
          body || attachment!.name,
          profile?.name,
          profile?.email || undefined
        );
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

  function onEmojiSelect(emoji: string) {
    setText((t) => t + emoji);
    textInputRef.current?.focus();
  }

  function onStartChat(e: FormEvent) {
    e.preventDefault();
    if (!preChatName.trim()) return;
    const newProfile = { name: preChatName.trim(), email: preChatEmail.trim() };
    saveVisitorProfile(newProfile);
    setProfile(newProfile);
  }

  const accentStyle = settings ? ({ "--accent": settings.primaryColor } as CSSProperties) : undefined;
  const positionClass = settings?.position === "left" ? "left" : "";
  const needsPreChatForm = !conversation && !profile;

  if (!open) {
    return (
      <button className={`widget-bubble ${positionClass}`} style={accentStyle} onClick={() => setOpen(true)} aria-label="Open chat">
        💬
      </button>
    );
  }

  return (
    <div className={`widget-panel ${positionClass}`} style={accentStyle}>
      <header>
        <div className="widget-avatar">
          {settings?.logoUrl ? <img src={settings.logoUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} /> : "🎧"}
        </div>
        <div className="widget-header-text">
          <span className="agent-name">{settings?.companyName ?? "Support"}</span>
          <span className="online-dot">
            <i /> online
          </span>
        </div>
        <button className="widget-close" onClick={() => setOpen(false)} aria-label="Close chat">
          ✕
        </button>
      </header>

      {needsPreChatForm ? (
        <form className="prechat-form" onSubmit={onStartChat}>
          <p>{settings?.welcomeMessage ?? "Hi! How can we help?"}</p>
          <label>
            Your name
            <input value={preChatName} onChange={(e) => setPreChatName(e.target.value)} required />
          </label>
          <label>
            Email (optional)
            <input type="email" value={preChatEmail} onChange={(e) => setPreChatEmail(e.target.value)} />
          </label>
          <button type="submit" className="send-btn" disabled={!preChatName.trim()}>
            Start chat
          </button>
        </form>
      ) : (
        <>
          <div className="messages">
            {messages.length === 0 && <p className="muted widget-welcome">{settings?.welcomeMessage ?? "Hi! How can we help?"}</p>}
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.senderType === "CUSTOMER" ? "mine" : "theirs"}`}>
                {m.text && <p>{m.text}</p>}
                {m.attachmentUrl &&
                  (isImageAttachment(m.attachmentName) ? (
                    <img
                      src={m.attachmentUrl}
                      alt={m.attachmentName ?? "attachment"}
                      className="image-attachment"
                      onClick={() => window.open(m.attachmentUrl!, "_blank")}
                    />
                  ) : (
                    <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="file-chip">
                      📎 {m.attachmentName ?? "attachment"}
                    </a>
                  ))}
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
                <EmojiPicker onSelect={onEmojiSelect} disabled={sending} />
                <input
                  ref={textInputRef}
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
        </>
      )}
    </div>
  );
}
