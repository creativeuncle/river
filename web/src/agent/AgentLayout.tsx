import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  fetchAgents,
  fetchCannedReplies,
  fetchGroups,
  fetchInbox,
  type Agent,
  type CannedReply,
  type ConversationNote,
  type Group,
  type InboxConversation,
} from "../lib/api";
import { createSocket } from "../lib/socket";
import { useAgentAuth } from "./AgentAuthContext";
import { Sidebar, type ScopeFilter, type SidebarSection, type StatusFilter } from "./Sidebar";
import { ToastStack, type Toast } from "./Toast";
import { TopBar } from "./TopBar";

const SECTION_PATHS: Record<SidebarSection, string> = {
  home: "/agent/home",
  conversations: "/agent",
  engage: "/agent/engage",
  automate: "/agent/automate",
  archives: "/agent/archives",
  team: "/agent/team",
  reports: "/agent/reports",
  apps: "/agent/apps",
  billing: "/agent/billing",
  settings: "/agent/settings",
};

const MANAGE_ROLES = ["Owner", "Admin"];

export interface AgentOutletContext {
  socket: Socket | null;
  conversations: InboxConversation[];
  refreshInbox: () => void;
  agents: Agent[];
  refreshAgents: () => void;
  onlineAgentIds: Set<string>;
  myRole: string;
  groups: Group[];
  refreshGroups: () => void;
  cannedReplies: CannedReply[];
  refreshCannedReplies: () => void;
  scope: ScopeFilter;
  status: StatusFilter;
}

export function AgentLayout() {
  const { session, logout } = useAgentAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [sidebarExpanded, setSidebarExpanded] = useState(() => localStorage.getItem("river:sidebarExpanded") === "1");
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [onlineAgentIds, setOnlineAgentIds] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<Group[]>([]);
  const [cannedReplies, setCannedReplies] = useState<CannedReply[]>([]);
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshInbox = useCallback(() => {
    if (!session) return;
    fetchInbox(session.token).then((r) => setConversations(r.conversations));
  }, [session]);

  const refreshAgents = useCallback(() => {
    if (!session) return;
    fetchAgents(session.token).then((r) => {
      setAgents(r.agents);
      // Union rather than replace: the socket's "presence:list"/"presence:update"
      // events are the source of truth for online status. This REST snapshot can
      // resolve after those events (e.g. right after this agent's own socket
      // connects), and replacing the set outright would then incorrectly stomp
      // their own online status back to offline with nothing left to correct it.
      setOnlineAgentIds((prev) => new Set([...prev, ...r.onlineAgentIds]));
    });
  }, [session]);

  const refreshGroups = useCallback(() => {
    if (!session) return;
    fetchGroups(session.token).then((r) => setGroups(r.groups));
  }, [session]);

  const refreshCannedReplies = useCallback(() => {
    if (!session) return;
    fetchCannedReplies(session.token).then((r) => setCannedReplies(r.cannedReplies));
  }, [session]);

  useEffect(() => {
    refreshInbox();
    refreshAgents();
    refreshGroups();
    refreshCannedReplies();
  }, [refreshInbox, refreshAgents, refreshGroups, refreshCannedReplies]);

  useEffect(() => {
    if (!session) return;
    const s = createSocket(session.token);
    socketRef.current = s;
    setSocket(s);

    s.on("conversation:new", refreshInbox);
    s.on("conversation:updated", refreshInbox);

    s.on("presence:list", ({ onlineAgentIds: ids }: { onlineAgentIds: string[] }) => {
      setOnlineAgentIds(new Set(ids));
    });
    s.on("presence:update", ({ agentId, online }: { agentId: string; online: boolean }) => {
      setOnlineAgentIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(agentId);
        else next.delete(agentId);
        return next;
      });
    });

    s.on("note:mention", ({ note, conversationId }: { note: ConversationNote; conversationId: string }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [
        ...prev,
        {
          id,
          text: `${note.agent.name} mentioned you in a note`,
          onClick: () => navigate(`/agent?open=${conversationId}`),
          conversationId,
        },
      ]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [session, refreshInbox, navigate]);

  function toggleSidebar() {
    setSidebarExpanded((prev) => {
      localStorage.setItem("river:sidebarExpanded", prev ? "0" : "1");
      return !prev;
    });
  }

  if (!session) return null;

  const myRole = agents.find((a) => a.id === session.agentId)?.role ?? "Agent";

  const activeSection: SidebarSection =
    (Object.keys(SECTION_PATHS) as SidebarSection[]).find((key) => {
      const path = SECTION_PATHS[key];
      return path === "/agent" ? location.pathname === "/agent" : location.pathname.startsWith(path);
    }) ?? "conversations";

  const context: AgentOutletContext = {
    socket,
    conversations,
    refreshInbox,
    agents,
    refreshAgents,
    onlineAgentIds,
    myRole,
    groups,
    refreshGroups,
    cannedReplies,
    refreshCannedReplies,
    scope,
    status,
  };

  return (
    <div className="agent-shell-outer">
      <TopBar conversations={conversations} canManage={MANAGE_ROLES.includes(myRole)} onAgentInvited={refreshAgents} />
      <div className={`agent-shell ${sidebarExpanded ? "" : "sidebar-collapsed"}`}>
        <Sidebar
          conversations={conversations}
          onlineAgentIds={onlineAgentIds}
          currentAgentId={session.agentId}
          currentAgentName={session.name}
          myRole={myRole}
          expanded={sidebarExpanded}
          onToggleExpanded={toggleSidebar}
          activeSection={activeSection}
          onNavigate={(section) => navigate(SECTION_PATHS[section])}
          scope={scope}
          status={status}
          onScopeChange={setScope}
          onStatusChange={setStatus}
          onLogout={logout}
        />
        <div className="agent-shell-content">
          <Outlet context={context} />
        </div>
      </div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
