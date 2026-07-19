import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon } from "@hugeicons/core-free-icons";
import type { InboxConversation } from "../lib/api";
import { initials } from "../lib/avatar";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function InboxList({
  title,
  conversations,
  selectedId,
  onSelect,
}: {
  title: string;
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const name = c.visitorName || `guest ${c.visitorId.slice(0, 6)}`;
    const preview = c.lastMessage?.text ?? "";
    return `${name} ${preview}`.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <div className="inbox-list">
      <div className="inbox-list-header">
        <span>{title}</span>
        <span className="row-count" style={{ marginLeft: "auto" }}>
          {filtered.length}
        </span>
      </div>

      <div className="inbox-search">
        <div className="search-box">
          <HugeiconsIcon icon={SearchIcon} size={15} />
          <input placeholder="Search chat" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="inbox-filter-chips">
        <span className="chip active">Newest</span>
      </div>

      <div className="inbox-scroll">
        <ul>
          {filtered.map((c) => (
            <li key={c.id}>
              <button className={c.id === selectedId ? "active" : ""} onClick={() => onSelect(c.id)}>
                <div className="agent-avatar">{initials(c.visitorName || "G U")}</div>
                <div className="inbox-row-content">
                  <div className="inbox-row-top">
                    <span className="visitor-name">{c.visitorName || `Guest ${c.visitorId.slice(0, 6)}`}</span>
                    <time>{timeAgo(c.updatedAt)}</time>
                  </div>
                  <div className="inbox-row-preview">
                    <span className="truncate">{c.lastMessage ? c.lastMessage.text || "📎 Attachment" : "…"}</span>
                    {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="muted empty-inbox">No conversations here.</p>}
      </div>
    </div>
  );
}
