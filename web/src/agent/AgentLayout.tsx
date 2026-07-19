import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { fetchAgents, fetchInbox, type Agent, type InboxConversation } from "../lib/api";
import { createSocket } from "../lib/socket";
import { useAgentAuth } from "./AgentAuthContext";
import { Sidebar, type ScopeFilter, type StatusFilter } from "./Sidebar";

export interface AgentOutletContext {
  socket: Socket | null;
  conversations: InboxConversation[];
  refreshInbox: () => void;
  agents: Agent[];
  refreshAgents: () => void;
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
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const refreshInbox = useCallback(() => {
    if (!session) return;
    fetchInbox(session.token).then((r) => setConversations(r.conversations));
  }, [session]);

  const refreshAgents = useCallback(() => {
    if (!session) return;
    fetchAgents(session.token).then((r) => setAgents(r.agents));
  }, [session]);

  useEffect(() => {
    refreshInbox();
    refreshAgents();
  }, [refreshInbox, refreshAgents]);

  useEffect(() => {
    if (!session) return;
    const s = createSocket(session.token);
    socketRef.current = s;
    setSocket(s);

    s.on("conversation:new", refreshInbox);
    s.on("conversation:updated", refreshInbox);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [session, refreshInbox]);

  function toggleSidebar() {
    setSidebarExpanded((prev) => {
      localStorage.setItem("river:sidebarExpanded", prev ? "0" : "1");
      return !prev;
    });
  }

  if (!session) return null;

  const context: AgentOutletContext = { socket, conversations, refreshInbox, agents, refreshAgents, scope, status };

  return (
    <div className={`agent-shell ${sidebarExpanded ? "" : "sidebar-collapsed"}`}>
      <Sidebar
        conversations={conversations}
        agents={agents}
        currentAgentId={session.agentId}
        currentAgentName={session.name}
        expanded={sidebarExpanded}
        onToggleExpanded={toggleSidebar}
        activeSection={location.pathname.startsWith("/agent/team") ? "team" : "conversations"}
        onNavigateConversations={() => navigate("/agent")}
        onNavigateTeam={() => navigate("/agent/team")}
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
  );
}
