import { useEffect, useRef, useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Attachment01Icon, Image01Icon, SmileIcon, SentIcon, PauseIcon, Cancel01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import type { Conversation, Message } from "../lib/api";
import { initials } from "../lib/avatar";

export function ConversationThread({
  conversation,
  messages,
  onSend,
  onSendFile,
  onTyping,
  onAssignToMe,
  onToggleStatus,
  visitorTyping,
}: {
  conversation: Conversation;
  messages: Message[];
  onSend: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  onTyping: () => void;
  onAssignToMe: () => void;
  onToggleStatus: () => void;
  visitorTyping: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
            {m.text && <p>{m.text}</p>}
            {m.attachmentUrl && (
              <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="file-chip">
                📎 {m.attachmentName ?? "attachment"}
              </a>
            )}
            <time>{new Date(m.createdAt).toLocaleTimeString()}</time>
          </div>
        ))}
        {visitorTyping && <p className="muted typing-indicator">Customer is typing…</p>}
        <div ref={bottomRef} />
      </div>

      <form className="composer thread-composer" onSubmit={onSubmit}>
        <div className="composer-row">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onTyping();
            }}
            placeholder="Reply…"
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
            <button type="button" className="icon-btn" title="Insert emoji" onClick={() => setText((t) => t + "🙂")} disabled={disabled}>
              <HugeiconsIcon icon={SmileIcon} size={17} />
            </button>
          </div>
          <button type="submit" className="send-btn" disabled={disabled || !text.trim()}>
            <HugeiconsIcon icon={SentIcon} size={15} />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
