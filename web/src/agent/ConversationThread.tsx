import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, Message } from "../lib/api";

export function ConversationThread({
  conversation,
  messages,
  onSend,
  onTyping,
  visitorTyping,
}: {
  conversation: Conversation;
  messages: Message[];
  onSend: (text: string) => Promise<void>;
  onTyping: () => void;
  visitorTyping: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="conversation-thread">
      <header>
        <span className="visitor-name">{conversation.visitorName || `Guest ${conversation.visitorId.slice(0, 6)}`}</span>
        <span className={`status-pill ${conversation.status.toLowerCase()}`}>{conversation.status}</span>
      </header>
      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.senderType === "AGENT" ? "mine" : "theirs"}`}>
            <p>{m.text}</p>
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
      <form className="composer" onSubmit={onSubmit}>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          placeholder="Reply…"
          disabled={sending || conversation.status === "CLOSED"}
        />
        <button type="submit" disabled={sending || !text.trim() || conversation.status === "CLOSED"}>
          Send
        </button>
      </form>
    </div>
  );
}
