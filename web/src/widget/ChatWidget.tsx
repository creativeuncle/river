import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Socket } from "socket.io-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Attachment01Icon, SentIcon } from "@hugeicons/core-free-icons";
import chatIcon from "./chat-icon.svg";
import {
  fetchMyConversation,
  fetchVisitorMessages,
  fetchWidgetSettings,
  resolveAssetUrl,
  sendVisitorMessage,
  startConversation,
  submitRating,
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
  const [showProactive, setShowProactive] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingHover, setRatingHover] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(getVisitorId());

  useEffect(() => {
    fetchWidgetSettings().then((r) => setSettings(r.settings));
  }, []);

  // Engage: show a proactive bubble if the visitor hasn't opened the widget
  // within the configured delay. Only ever shown once per page load.
  useEffect(() => {
    if (!settings?.proactiveMessageEnabled || open) return;
    const timer = setTimeout(() => setShowProactive(true), settings.proactiveMessageDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [settings, open]);

  // Tells the host page's iframe wrapper (see public/widget.js) how big and
  // which corner to render the iframe in — a no-op when this widget isn't
  // embedded in an iframe (postMessage to yourself is harmless).
  useEffect(() => {
    window.parent.postMessage({ source: "river-widget", type: open ? "open" : "closed" }, "*");
  }, [open]);

  useEffect(() => {
    window.parent.postMessage({ source: "river-widget", type: "proactive", visible: showProactive && !open }, "*");
  }, [showProactive, open]);

  useEffect(() => {
    if (!settings) return;
    window.parent.postMessage(
      { source: "river-widget", type: "position", side: settings.position === "left" ? "left" : "right" },
      "*"
    );
  }, [settings]);

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

  async function onSubmitRating(rating: number) {
    if (!conversation) return;
    setRatingSubmitted(true);
    try {
      await submitRating(conversation.id, visitorId.current, rating);
      setConversation((prev) => (prev ? { ...prev, rating } : prev));
    } catch {
      setRatingSubmitted(false);
    }
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
      <>
        {showProactive && settings?.proactiveMessageEnabled && (
          <div className={`proactive-bubble ${positionClass}`} style={accentStyle}>
            <button className="proactive-bubble-close" onClick={() => setShowProactive(false)} aria-label="Dismiss">
              ✕
            </button>
            <p onClick={() => setOpen(true)}>{settings.proactiveMessageText}</p>
          </div>
        )}
        <button className={`widget-bubble ${positionClass}`} style={accentStyle} onClick={() => setOpen(true)} aria-label="Open chat">
          <img src={chatIcon} alt="" className="widget-bubble-icon" />
        </button>
      </>
    );
  }

  return (
    <div className={`widget-panel ${positionClass}`} style={accentStyle}>
      <header>
        <div className="widget-avatar">
          {settings?.logoUrl ? (
            <img src={resolveAssetUrl(settings.logoUrl)} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          ) : (
            "🎧"
          )}
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
                      src={resolveAssetUrl(m.attachmentUrl)}
                      alt={m.attachmentName ?? "attachment"}
                      className="image-attachment"
                      onClick={() => window.open(resolveAssetUrl(m.attachmentUrl!), "_blank")}
                    />
                  ) : (
                    <a href={resolveAssetUrl(m.attachmentUrl)} target="_blank" rel="noreferrer" className="file-chip">
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
            <div className="widget-closed-note">
              <p className="muted">This conversation has been closed.</p>
              {conversation.rating == null && !ratingSubmitted ? (
                <div className="csat-prompt">
                  <p>How was your experience?</p>
                  <div className="csat-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`csat-star ${star <= ratingHover ? "hover" : ""}`}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => onSubmitRating(star)}
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                (conversation.rating != null || ratingSubmitted) && <p className="muted csat-thanks">Thanks for your feedback!</p>
              )}
            </div>
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
