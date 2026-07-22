import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { createAgent, type InboxConversation } from "../lib/api";
import { initials } from "../lib/avatar";
import { RiverLogo } from "../components/RiverLogo";
import { useAgentAuth } from "./AgentAuthContext";
import { InviteAgentModal } from "./InviteAgentModal";

export function TopBar({
  conversations,
  canManage,
  onAgentInvited,
}: {
  conversations: InboxConversation[];
  canManage: boolean;
  onAgentInvited: () => void;
}) {
  const { session, logout } = useAgentAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowAvatarMenu(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results =
    query.trim().length > 0
      ? conversations
          .filter((c) => (c.visitorName || "").toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 6)
      : [];

  function openConversation(id: string) {
    setQuery("");
    setShowResults(false);
    navigate(`/agent?open=${id}`);
  }

  return (
    <div className="top-bar" ref={rootRef}>
      <RiverLogo className="top-bar-brand" />

      <div className="top-bar-search">
        <div className="search-box">
          <HugeiconsIcon icon={SearchIcon} size={16} />
          <input
            ref={searchRef}
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
        {showResults && results.length > 0 && (
          <div className="top-search-results">
            {results.map((c) => (
              <button key={c.id} className="top-search-result" onClick={() => openConversation(c.id)}>
                <div className="agent-avatar">{initials(c.visitorName || "G U")}</div>
                <div>
                  <div className="visitor-name">{c.visitorName}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.lastMessage?.text || "…"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="top-bar-actions">
        {canManage && (
          <button className="top-bar-invite" onClick={() => setShowInvite(true)}>
            <HugeiconsIcon icon={UserAdd01Icon} size={15} />
            Invite
          </button>
        )}
        <div style={{ position: "relative" }}>
          <button className="agent-avatar top-bar-avatar" onClick={() => setShowAvatarMenu((s) => !s)}>
            {session ? initials(session.name) : ""}
          </button>
          {showAvatarMenu && (
            <div className="team-row-menu" style={{ top: 36, right: 0, left: "auto" }}>
              <button onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </div>

      {showInvite && (
        <InviteAgentModal
          onClose={() => setShowInvite(false)}
          onCreate={async (data) => {
            if (!session) return;
            await createAgent(session.token, data);
            setShowInvite(false);
            onAgentInvited();
          }}
        />
      )}
    </div>
  );
}
