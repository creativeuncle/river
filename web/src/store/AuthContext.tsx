import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IndexedDbSignalStore } from "../lib/signalStore";

interface Session {
  token: string;
  userId: string;
  username: string;
}

interface AuthContextValue {
  session: Session | null;
  signalStore: IndexedDbSignalStore | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "river:session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  });

  const signalStore = useMemo(
    () => (session ? new IndexedDbSignalStore(session.username) : null),
    [session?.username]
  );

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const value: AuthContextValue = {
    session,
    signalStore,
    login: setSession,
    logout: () => setSession(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
