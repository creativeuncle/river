import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConversations, searchUsers } from "../lib/api";
import { useAuth } from "../store/AuthContext";

export function DashboardPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; username: string }[]>([]);
  const [conversations, setConversations] = useState<
    { conversationId: string; lastMessageAt: string; otherUsername: string | null }[]
  >([]);

  useEffect(() => {
    if (!session) return;
    fetchConversations(session.token).then((r) => setConversations(r.conversations));
  }, [session]);

  useEffect(() => {
    if (!session || query.trim().length === 0) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchUsers(session.token, query.trim()).then((r) => setResults(r.users));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, session]);

  if (!session) return null;

  return (
    <div className="dashboard">
      <header>
        <h1>river</h1>
        <div>
          <span className="me">@{session.username}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="search">
        <input
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="search-results">
            {results.map((u) => (
              <li key={u.id}>
                <button onClick={() => navigate(`/chat/${u.username}`)}>@{u.username}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="conversations">
        <h2>Chats</h2>
        {conversations.length === 0 && <p className="muted">No conversations yet — search a username to start.</p>}
        <ul>
          {conversations
            .filter((c) => c.otherUsername)
            .map((c) => (
              <li key={c.conversationId}>
                <button onClick={() => navigate(`/chat/${c.otherUsername}`)}>
                  @{c.otherUsername} · {new Date(c.lastMessageAt).toLocaleString()}
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
