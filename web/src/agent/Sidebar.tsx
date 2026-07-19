import { HugeiconsIcon } from "@hugeicons/react";
import {
  SearchIcon,
  Bookmark01Icon,
  Home01Icon,
  Chat01Icon,
  InboxIcon,
  Tag01Icon,
  UserGroupIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import type { InboxConversation } from "../lib/api";
import { initials } from "../lib/avatar";
import { ThemeToggle } from "../theme/ThemeToggle";

export type ScopeFilter = "all" | "mine" | "unassigned";
export type StatusFilter = "ALL" | "OPEN" | "CLOSED";

export function Sidebar({
  conversations,
  agents,
  currentAgentId,
  currentAgentName,
  scope,
  status,
  onScopeChange,
  onStatusChange,
  onLogout,
}: {
  conversations: InboxConversation[];
  agents: { id: string; name: string; email: string }[];
  currentAgentId: string;
  currentAgentName: string;
  scope: ScopeFilter;
  status: StatusFilter;
  onScopeChange: (s: ScopeFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
  onLogout: () => void;
}) {
  const counts = {
    all: conversations.length,
    mine: conversations.filter((c) => c.assignedAgentId === currentAgentId).length,
    unassigned: conversations.filter((c) => !c.assignedAgentId).length,
    open: conversations.filter((c) => c.status === "OPEN").length,
    closed: conversations.filter((c) => c.status === "CLOSED").length,
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-search">
        <div className="search-box">
          <HugeiconsIcon icon={SearchIcon} size={16} />
          <input placeholder="Search chat" />
        </div>
      </div>

      <div className="sidebar-nav-icons">
        <button className="icon-btn active" title="Conversations">
          <HugeiconsIcon icon={Chat01Icon} size={18} />
        </button>
        <button className="icon-btn" title="Home">
          <HugeiconsIcon icon={Home01Icon} size={18} />
        </button>
        <button className="icon-btn" title="Saved">
          <HugeiconsIcon icon={Bookmark01Icon} size={18} />
        </button>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Inbox</div>
        <button className={`sidebar-row ${scope === "all" ? "active" : ""}`} onClick={() => onScopeChange("all")}>
          <span className="row-icon">
            <HugeiconsIcon icon={InboxIcon} size={15} />
          </span>
          <span className="row-label">All</span>
          <span className="row-count">{counts.all}</span>
        </button>
        <button className={`sidebar-row ${scope === "mine" ? "active" : ""}`} onClick={() => onScopeChange("mine")}>
          <span className="status-dot agent" />
          <span className="row-label">Assigned to me</span>
          <span className="row-count">{counts.mine}</span>
        </button>
        <button
          className={`sidebar-row ${scope === "unassigned" ? "active" : ""}`}
          onClick={() => onScopeChange("unassigned")}
        >
          <span className="status-dot paused" />
          <span className="row-label">Unassigned</span>
          <span className="row-count">{counts.unassigned}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Status</div>
        <button className={`sidebar-row ${status === "ALL" ? "active" : ""}`} onClick={() => onStatusChange("ALL")}>
          <span className="status-dot all" />
          <span className="row-label">All</span>
          <span className="row-count">{counts.all}</span>
        </button>
        <button className={`sidebar-row ${status === "OPEN" ? "active" : ""}`} onClick={() => onStatusChange("OPEN")}>
          <span className="status-dot agent" />
          <span className="row-label">Open</span>
          <span className="row-count">{counts.open}</span>
        </button>
        <button
          className={`sidebar-row ${status === "CLOSED" ? "active" : ""}`}
          onClick={() => onStatusChange("CLOSED")}
        >
          <span className="status-dot paused" />
          <span className="row-label">Closed</span>
          <span className="row-count">{counts.closed}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Channel</div>
        <button className="sidebar-row active">
          <span className="row-icon">
            <HugeiconsIcon icon={Tag01Icon} size={15} />
          </span>
          <span className="row-label">Web widget</span>
          <span className="row-count">{counts.all}</span>
        </button>
      </div>

      <div className="sidebar-section sidebar-agents">
        <div className="sidebar-section-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <HugeiconsIcon icon={UserGroupIcon} size={13} />
            Agents
          </span>
        </div>
        {agents.map((a) => (
          <div className="agent-row" key={a.id}>
            <div className="agent-avatar">{initials(a.name)}</div>
            <div className="agent-row-text">
              <span className="agent-row-name">{a.name}</span>
              <span className="agent-row-status" style={a.id !== currentAgentId ? { color: "var(--text-muted)" } : undefined}>
                {a.id === currentAgentId ? "Online" : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="agent-row">
          <div className="agent-avatar">{initials(currentAgentName)}</div>
          <div className="agent-row-text">
            <span className="agent-row-name">{currentAgentName}</span>
            <span className="agent-row-status">Online</span>
          </div>
        </div>
        <button className="icon-btn" title="Log out" onClick={onLogout}>
          <HugeiconsIcon icon={Logout01Icon} size={17} />
        </button>
      </div>
    </nav>
  );
}
