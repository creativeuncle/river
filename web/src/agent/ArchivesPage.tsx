import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadArchivesCsv, fetchArchives, type ArchivedConversation } from "../lib/api";
import { initials } from "../lib/avatar";
import { useAgentAuth } from "./AgentAuthContext";

export function ArchivesPage() {
  const { session } = useAgentAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [conversations, setConversations] = useState<ArchivedConversation[]>([]);
  const [exporting, setExporting] = useState(false);

  function refresh() {
    if (!session) return;
    fetchArchives(session.token, {
      q: q || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }).then((r) => setConversations(r.conversations));
  }

  useEffect(refresh, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onExport() {
    if (!session) return;
    setExporting(true);
    try {
      await downloadArchivesCsv(session.token, {
        q: q || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="archives-page">
      <div className="archives-header">
        <h2>Archives</h2>
        <button type="button" className="send-btn" onClick={onExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="archives-filters">
        <input
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh()}
        />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="muted">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={refresh}>
          Filter
        </button>
      </div>

      <div className="archives-list">
        {conversations.length === 0 && <p className="muted" style={{ padding: 20 }}>No closed conversations found.</p>}
        {conversations.map((c) => (
          <button className="archives-row" key={c.id} onClick={() => navigate(`/agent?open=${c.id}`)}>
            <div className="agent-avatar">{initials(c.visitorName || "G U")}</div>
            <div className="archives-row-main">
              <div className="archives-row-name">{c.visitorName || "Anonymous"}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {c.lastMessage?.text || "(no messages)"}
              </div>
            </div>
            <div className="archives-row-meta">
              <span className="muted">{c.assignedAgent?.name ?? "Unassigned"}</span>
              <span className="muted">{c.closedAt ? new Date(c.closedAt).toLocaleDateString() : ""}</span>
              {c.rating != null && <span className="csat-badge">{"★".repeat(c.rating)}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
