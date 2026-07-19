import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SearchIcon,
  UserAdd01Icon,
  MoreHorizontalIcon,
  PencilEditIcon,
  Delete02Icon,
  Cancel01Icon,
  Clock01Icon,
  Target01Icon,
  ChartLineData01Icon,
} from "@hugeicons/core-free-icons";
import { createAgent, deleteAgent, updateAgent, type Agent } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";
import { initials } from "../lib/avatar";

type Tab = "agents" | "chatbots" | "groups" | "suspended";

const TABS: { id: Tab; label: string }[] = [
  { id: "agents", label: "Agents" },
  { id: "chatbots", label: "Chatbots" },
  { id: "groups", label: "Groups" },
  { id: "suspended", label: "Suspended agents" },
];

export function TeamPage() {
  const { session } = useAgentAuth();
  const { agents, refreshAgents, conversations } = useOutletContext<AgentOutletContext>();

  const [tab, setTab] = useState<Tab>("agents");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = agents.find((a) => a.id === selectedId) ?? null;

  const filtered = agents.filter((a) => `${a.name} ${a.email}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function onDelete(agent: Agent) {
    if (!session) return;
    if (agent.id === session.agentId) {
      setError("You can't remove your own account");
      return;
    }
    if (!confirm(`Remove ${agent.name} from the team?`)) return;
    try {
      await deleteAgent(session.token, agent.id);
      if (selectedId === agent.id) setSelectedId(null);
      refreshAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove agent");
    }
  }

  return (
    <div className="team-page">
      <div className="team-main">
        <header className="team-page-header">
          <h2>Team</h2>
        </header>

        <div className="team-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`team-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "agents" ? (
          <div className="team-coming-soon">
            <p className="muted">{TABS.find((t) => t.id === tab)?.label} isn't built yet — coming in a future update.</p>
          </div>
        ) : (
          <>
            <div className="team-toolbar">
              <div className="search-box">
                <HugeiconsIcon icon={SearchIcon} size={15} />
                <input placeholder="Search agent" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button className="send-btn" onClick={() => setShowAddModal(true)}>
                <HugeiconsIcon icon={UserAdd01Icon} size={15} />
                Invite agents
              </button>
            </div>

            {error && <p className="error" style={{ padding: "0 20px" }}>{error}</p>}

            <div className="team-table">
              <div className="team-table-title">Active ({filtered.length})</div>
              <div className="team-table-columns">
                <span>Name</span>
                <span>Role</span>
                <span>Status</span>
              </div>
              <div className="team-rows">
                {filtered.map((a) => (
                  <div
                    key={a.id}
                    className={`team-row ${selectedId === a.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedId(a.id);
                      setEditing(false);
                    }}
                  >
                    <div className="team-row-name">
                      <div className="agent-avatar">{initials(a.name)}</div>
                      <div>
                        <div className="visitor-name">
                          {a.name} {a.id === session?.agentId && <span className="muted">(You)</span>}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {a.email}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="status-pill">{a.role}</span>
                    </div>
                    <div className="team-row-status">
                      <span className="status-dot agent" />
                      {a.id === session?.agentId ? "Accepting chats" : "—"}
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === a.id ? null : a.id);
                        }}
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                      </button>
                      {openMenuId === a.id && (
                        <div className="team-row-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedId(a.id);
                              setEditing(true);
                              setOpenMenuId(null);
                            }}
                          >
                            <HugeiconsIcon icon={PencilEditIcon} size={14} />
                            Edit
                          </button>
                          <button
                            className="danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              onDelete(a);
                            }}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <AgentDetailsPanel
          agent={selected}
          totalChats={conversations.filter((c) => c.assignedAgentId === selected.id).length}
          editing={editing}
          onStartEdit={() => setEditing(true)}
          onClose={() => {
            setSelectedId(null);
            setEditing(false);
          }}
          onSave={async (data) => {
            if (!session) return;
            await updateAgent(session.token, selected.id, data);
            setEditing(false);
            refreshAgents();
          }}
        />
      )}

      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onCreate={async (data) => {
            if (!session) return;
            await createAgent(session.token, data);
            setShowAddModal(false);
            refreshAgents();
          }}
        />
      )}
    </div>
  );
}

function AgentDetailsPanel({
  agent,
  totalChats,
  editing,
  onStartEdit,
  onClose,
  onSave,
}: {
  agent: Agent;
  totalChats: number;
  editing: boolean;
  onStartEdit: () => void;
  onClose: () => void;
  onSave: (data: { name: string; title: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(agent.name);
  const [title, setTitle] = useState(agent.title ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name: name.trim(), title: title.trim() || null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="customer-info-panel team-details-panel">
      <div className="customer-info-header">
        <h3 style={{ flex: 1 }}>Details</h3>
        <button className="icon-btn" onClick={onClose}>
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      {editing ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="muted" style={{ fontSize: 12 }}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="muted" style={{ fontSize: 12 }}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product Expert"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="send-btn" disabled={saving}>
              Save
            </button>
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="customer-info-header">
            <div className="agent-avatar">{initials(agent.name)}</div>
            <span className="name">{agent.name}</span>
            <span className="status-pill">{agent.role}</span>
          </div>
          {agent.title && <p className="muted" style={{ marginBottom: 8 }}>{agent.title}</p>}
          <p className="muted" style={{ marginBottom: 16 }}>{agent.email}</p>

          <button className="add-attribute-btn" onClick={onStartEdit} style={{ marginBottom: 8 }}>
            <HugeiconsIcon icon={PencilEditIcon} size={14} />
            Edit details
          </button>

          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Chat limit</span>
              <span className="info-field-value">Unlimited</span>
            </span>
          </div>
          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Login status</span>
              <span className="info-field-value">—</span>
            </span>
          </div>
          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Last seen</span>
              <span className="info-field-value">—</span>
            </span>
          </div>

          <div className="notes-section">
            <div className="notes-section-title">Groups</div>
            <p className="muted" style={{ fontSize: 12 }}>No groups yet.</p>
          </div>

          <div className="notes-section">
            <div className="notes-section-title">
              <HugeiconsIcon icon={Clock01Icon} size={15} />
              Working hours
            </div>
            <div className="working-hours-card">
              <span>Set working hours to better manage staffing.</span>
              <button disabled title="Coming soon">
                Get feature
              </button>
            </div>
          </div>

          <div className="notes-section">
            <div className="notes-section-title">
              <HugeiconsIcon icon={ChartLineData01Icon} size={15} />
              Performance
            </div>
            <div className="info-field">
              <span className="info-field-text">
                <span className="info-field-label">Total chats assigned</span>
                <span className="info-field-value">{totalChats}</span>
              </span>
            </div>
            <div className="info-field" style={{ opacity: 0.6 }}>
              <span className="row-icon">
                <HugeiconsIcon icon={Target01Icon} size={15} />
              </span>
              <span className="info-field-text">
                <span className="info-field-label">Goals</span>
                <span className="info-field-value">Not set up yet</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AddAgentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; email: string; password: string; title?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name, email, password, title: title || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add agent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="customer-info-header">
          <h3 style={{ flex: 1 }}>Invite agent</h3>
          <button className="icon-btn" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
          There's no email/SMTP set up yet, so this creates the account directly — share the password with them yourself.
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="muted" style={{ fontSize: 12 }}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="muted" style={{ fontSize: 12 }}>
            Title (optional)
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Support Lead" style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="muted" style={{ fontSize: 12 }}>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="muted" style={{ fontSize: 12 }}>
            Temporary password
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="send-btn" disabled={busy}>
              {busy ? "Adding…" : "Add agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
