import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  SearchIcon,
  Home01Icon,
  Chat01Icon,
  Megaphone01Icon,
  Robot01Icon,
  Archive01Icon,
  UserGroupIcon,
  Chart01Icon,
  GridViewIcon,
  CreditCardIcon,
  Setting06Icon,
  HelpCircleIcon,
  SidebarLeft01Icon,
  InboxIcon,
  Tag01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import type { Agent, InboxConversation } from "../lib/api";
import { initials } from "../lib/avatar";
import { ThemeToggle } from "../theme/ThemeToggle";

export type ScopeFilter = "all" | "mine" | "unassigned";
export type StatusFilter = "ALL" | "OPEN" | "CLOSED";
export type SidebarSection =
  | "home"
  | "conversations"
  | "engage"
  | "automate"
  | "archives"
  | "team"
  | "reports"
  | "apps"
  | "billing"
  | "settings";

const MANAGE_ROLES = ["Owner", "Admin"];

interface NavItem {
  key: SidebarSection;
  label: string;
  icon: HugeiconsIconProps["icon"];
  gated?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", icon: Home01Icon },
  { key: "conversations", label: "Chat", icon: Chat01Icon },
  { key: "engage", label: "Engage", icon: Megaphone01Icon },
  { key: "automate", label: "Automate", icon: Robot01Icon },
  { key: "archives", label: "Archives", icon: Archive01Icon },
  { key: "team", label: "Team", icon: UserGroupIcon },
  { key: "reports", label: "Reports", icon: Chart01Icon },
  { key: "apps", label: "Apps", icon: GridViewIcon },
  { key: "billing", label: "Billing", icon: CreditCardIcon },
  { key: "settings", label: "Settings", icon: Setting06Icon, gated: true },
];

function PresenceDot({ online }: { online: boolean }) {
  return <span className={`presence-dot ${online ? "online" : "offline"}`} />;
}

export function Sidebar({
  conversations,
  agents,
  onlineAgentIds,
  currentAgentId,
  currentAgentName,
  myRole,
  scope,
  status,
  expanded,
  activeSection,
  onToggleExpanded,
  onNavigate,
  onScopeChange,
  onStatusChange,
  onLogout,
}: {
  conversations: InboxConversation[];
  agents: Agent[];
  onlineAgentIds: Set<string>;
  currentAgentId: string;
  currentAgentName: string;
  myRole: string;
  scope: ScopeFilter;
  status: StatusFilter;
  expanded: boolean;
  activeSection: SidebarSection;
  onToggleExpanded: () => void;
  onNavigate: (section: SidebarSection) => void;
  onScopeChange: (s: ScopeFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
  onLogout: () => void;
}) {
  const canManage = MANAGE_ROLES.includes(myRole);
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.gated || canManage);
  const counts = {
    all: conversations.length,
    mine: conversations.filter((c) => c.assignedAgentId === currentAgentId).length,
    unassigned: conversations.filter((c) => !c.assignedAgentId).length,
    open: conversations.filter((c) => c.status === "OPEN").length,
    closed: conversations.filter((c) => c.status === "CLOSED").length,
  };

  if (!expanded) {
    return (
      <nav className="sidebar collapsed">
        <button className="icon-btn rail-toggle" title="Expand sidebar" onClick={onToggleExpanded}>
          <HugeiconsIcon icon={SidebarLeft01Icon} size={18} />
        </button>
        {visibleNavItems.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`icon-btn rail-icon ${activeSection === key ? "active" : ""}`}
            title={label}
            onClick={() => onNavigate(key)}
          >
            <HugeiconsIcon icon={icon} size={18} />
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="icon-btn rail-icon" title="Help">
          <HugeiconsIcon icon={HelpCircleIcon} size={18} />
        </button>
      </nav>
    );
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-top-row">
        <button className="icon-btn" title="Collapse sidebar" onClick={onToggleExpanded}>
          <HugeiconsIcon icon={SidebarLeft01Icon} size={18} />
        </button>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </div>

      <div className="sidebar-search">
        <div className="search-box">
          <HugeiconsIcon icon={SearchIcon} size={16} />
          <input placeholder="Search chat" />
        </div>
      </div>

      <div className="sidebar-section">
        {visibleNavItems.map(({ key, label, icon }) => (
          <button key={key} className={`sidebar-row ${activeSection === key ? "active" : ""}`} onClick={() => onNavigate(key)}>
            <span className="row-icon">
              <HugeiconsIcon icon={icon} size={15} />
            </span>
            <span className="row-label">{label}</span>
          </button>
        ))}
      </div>

      {activeSection === "conversations" && (
        <>
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
        </>
      )}

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
              <span className="agent-row-status">
                <PresenceDot online={onlineAgentIds.has(a.id)} />
                {onlineAgentIds.has(a.id) ? "Online" : "Offline"}
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
            <span className="agent-row-status">
              <PresenceDot online={onlineAgentIds.has(currentAgentId)} />
              {onlineAgentIds.has(currentAgentId) ? "Online" : "Connecting…"}
            </span>
          </div>
        </div>
        <button className="icon-btn" title="Log out" onClick={onLogout}>
          <HugeiconsIcon icon={Logout01Icon} size={17} />
        </button>
      </div>
    </nav>
  );
}
