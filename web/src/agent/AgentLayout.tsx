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
import { Sidebar, type ScopeFilter, type StatusFilter } from "./Sidebar";
import { ToastStack, type Toast } from "./Toast";

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
      setOnlineAgentIds(new Set(r.onlineAgentIds));
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
          onClick: () => navigate("/agent"), // conversation selection happens on the dashboard page
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
    <div className={`agent-shell ${sidebarExpanded ? "" : "sidebar-collapsed"}`}>
      <Sidebar
        conversations={conversations}
        agents={agents}
        onlineAgentIds={onlineAgentIds}
        currentAgentId={session.agentId}
        currentAgentName={session.name}
        myRole={myRole}
        expanded={sidebarExpanded}
        onToggleExpanded={toggleSidebar}
        activeSection={
          location.pathname.startsWith("/agent/team")
            ? "team"
            : location.pathname.startsWith("/agent/settings")
              ? "settings"
              : "conversations"
        }
        onNavigateConversations={() => navigate("/agent")}
        onNavigateTeam={() => navigate("/agent/team")}
        onNavigateSettings={() => navigate("/agent/settings")}
        scope={scope}
        status={status}
        onScopeChange={setScope}
        onStatusChange={setStatus}
        onLogout={logout}
      />
      <div className="agent-shell-content">
        <Outlet context={context} />
      </div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
