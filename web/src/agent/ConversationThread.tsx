import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Attachment01Icon,
  Image01Icon,
  SentIcon,
  PauseIcon,
  Cancel01Icon,
  UserAdd01Icon,
  Setting06Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import {
  createCannedReply,
  deleteCannedReply,
  resolveAssetUrl,
  type CannedReply,
  type Conversation,
  type Message,
} from "../lib/api";
import { initials } from "../lib/avatar";
import { isImageAttachment } from "../lib/attachments";
import { EmojiPicker } from "../components/EmojiPicker";
import { useAgentAuth } from "./AgentAuthContext";

export function ConversationThread({
  conversation,
  messages,
  cannedReplies,
  onSend,
  onSendFile,
  onTyping,
  onAssignToMe,
  onToggleStatus,
  onCannedRepliesChanged,
  visitorTyping,
}: {
  conversation: Conversation;
  messages: Message[];
  cannedReplies: CannedReply[];
  onSend: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  onTyping: () => void;
  onAssignToMe: () => void;
  onToggleStatus: () => void;
  onCannedRepliesChanged: () => void;
  visitorTyping: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showManageCanned, setShowManageCanned] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const slashQuery = text.startsWith("/") ? text.slice(1).toLowerCase() : null;
  const cannedMatches = useMemo(() => {
    if (slashQuery === null) return [];
    return cannedReplies.filter(
      (c) => c.shortcut.toLowerCase().includes(slashQuery) || c.title.toLowerCase().includes(slashQuery)
    );
  }, [slashQuery, cannedReplies]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSending(true);
    try {
      await onSendFile(file);
    } finally {
      setSending(false);
    }
  }

  function insertCannedReply(c: CannedReply) {
    setText(c.text);
    textInputRef.current?.focus();
  }

  const disabled = sending || conversation.status === "CLOSED";

  return (
    <div className="conversation-thread">
      <header>
        <div className="agent-avatar">{initials(conversation.visitorName || "G U")}</div>
        <div className="thread-header-text">
          <span className="visitor-name">{conversation.visitorName || `Guest ${conversation.visitorId.slice(0, 6)}`}</span>
          <span className="online-line">Online</span>
        </div>
        <div className="thread-actions">
          <button title="Pause conversation (not wired up yet)" onClick={() => setPaused((p) => !p)}>
            <HugeiconsIcon icon={PauseIcon} size={14} />
            {paused ? "Resume" : "Pause"}
          </button>
          <button className="primary-dark" onClick={onToggleStatus}>
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
            {conversation.status === "OPEN" ? "Close" : "Reopen"}
          </button>
          <button className="icon-btn" title="Assign to me" onClick={onAssignToMe}>
            <HugeiconsIcon icon={UserAdd01Icon} size={16} />
          </button>
        </div>
      </header>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.senderType === "AGENT" ? "mine" : "theirs"}`}>
            {m.isAutomated && <span className="automated-tag">🤖 Automated reply</span>}
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
        {visitorTyping && <p className="muted typing-indicator">Customer is typing…</p>}
        <div ref={bottomRef} />
      </div>

      <form className="composer thread-composer" onSubmit={onSubmit}>
        <div className="composer-row" style={{ position: "relative" }}>
          {slashQuery !== null && cannedMatches.length > 0 && (
            <div className="canned-popover">
              {cannedMatches.map((c) => (
                <button type="button" key={c.id} className="canned-popover-item" onClick={() => insertCannedReply(c)}>
                  <span className="canned-shortcut">/{c.shortcut}</span>
                  <span className="canned-title">{c.title}</span>
                </button>
              ))}
            </div>
          )}
          <input
            ref={textInputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onTyping();
            }}
            placeholder="Reply… (type / for canned replies)"
            disabled={disabled}
          />
        </div>
        <div className="composer-row">
          <div className="composer-icons">
            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={pickFile} />
            <input type="file" ref={imageInputRef} accept="image/*" style={{ display: "none" }} onChange={pickFile} />
            <button type="button" className="icon-btn" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
              <HugeiconsIcon icon={Attachment01Icon} size={17} />
            </button>
            <button type="button" className="icon-btn" title="Attach image" onClick={() => imageInputRef.current?.click()} disabled={disabled}>
              <HugeiconsIcon icon={Image01Icon} size={17} />
            </button>
            <EmojiPicker
              disabled={disabled}
              onSelect={(emoji) => {
                setText((t) => t + emoji);
                textInputRef.current?.focus();
              }}
            />
            <button type="button" className="icon-btn" title="Manage canned replies" onClick={() => setShowManageCanned(true)}>
              <HugeiconsIcon icon={Setting06Icon} size={16} />
            </button>
          </div>
          <button type="submit" className="send-btn" disabled={disabled || !text.trim()}>
            <HugeiconsIcon icon={SentIcon} size={15} />
            Send
          </button>
        </div>
      </form>

      {showManageCanned && (
        <ManageCannedRepliesModal
          cannedReplies={cannedReplies}
          onClose={() => setShowManageCanned(false)}
          onChanged={onCannedRepliesChanged}
        />
      )}
    </div>
  );
}

function ManageCannedRepliesModal({
  cannedReplies,
  onClose,
  onChanged,
}: {
  cannedReplies: CannedReply[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { session } = useAgentAuth();
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await createCannedReply(session.token, { shortcut, title, text });
      setShortcut("");
      setTitle("");
      setText("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add canned reply");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!session) return;
    await deleteCannedReply(session.token, id);
    onChanged();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="customer-info-header">
          <h3 style={{ flex: 1 }}>Canned replies</h3>
          <button className="icon-btn" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="canned-list">
          {cannedReplies.map((c) => (
            <div key={c.id} className="canned-list-item">
              <div>
                <div className="canned-shortcut">/{c.shortcut}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.title}
                </div>
              </div>
              <button className="icon-btn" onClick={() => onDelete(c.id)}>
                <HugeiconsIcon icon={Delete02Icon} size={14} />
              </button>
            </div>
          ))}
          {cannedReplies.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No canned replies yet.</p>}
        </div>

        <form onSubmit={onAdd} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <label className="muted" style={{ fontSize: 12 }}>
            Shortcut (used as /shortcut)
            <input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="e.g. refund" required style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="muted" style={{ fontSize: 12 }}>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refund policy" required style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="muted" style={{ fontSize: 12 }}>
            Reply text
            <textarea className="note-input" value={text} onChange={(e) => setText(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="send-btn" disabled={busy}>
            {busy ? "Adding…" : "Add canned reply"}
          </button>
        </form>
      </div>
    </div>
  );
}
