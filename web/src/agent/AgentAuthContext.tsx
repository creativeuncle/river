import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AgentSession {
  token: string;
  agentId: string;
  name: string;
  email: string;
  isSuperAdmin?: boolean;
}

interface AgentAuthContextValue {
  session: AgentSession | null;
  login: (session: AgentSession) => void;
  logout: () => void;
}

const AgentAuthContext = createContext<AgentAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "river:agentSession";

export function AgentAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AgentSession | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentSession) : null;
  });

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  return (
    <AgentAuthContext.Provider value={{ session, login: setSession, logout: () => setSession(null) }}>
      {children}
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth(): AgentAuthContextValue {
  const ctx = useContext(AgentAuthContext);
  if (!ctx) throw new Error("useAgentAuth must be used within AgentAuthProvider");
  return ctx;
}
