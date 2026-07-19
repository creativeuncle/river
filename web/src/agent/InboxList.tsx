import type { InboxConversation } from "../lib/api";

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
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="inbox-list">
      <div className="inbox-list-header">Inbox ({conversations.length})</div>
      <ul>
        {conversations.map((c) => (
          <li key={c.id}>
            <button className={c.id === selectedId ? "active" : ""} onClick={() => onSelect(c.id)}>
              <div className="inbox-row-top">
                <span className="visitor-name">{c.visitorName || `Guest ${c.visitorId.slice(0, 6)}`}</span>
                <time>{timeAgo(c.updatedAt)}</time>
              </div>
              <div className="inbox-row-preview">
                {c.lastMessage ? c.lastMessage.text : "…"}
                {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
              </div>
            </button>
          </li>
        ))}
        {conversations.length === 0 && <p className="muted" style={{ padding: 12 }}>No conversations yet.</p>}
      </ul>
    </div>
  );
}
