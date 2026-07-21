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
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { createAgent, createGroup, deleteAgent, deleteGroup, updateAgent, type Agent, type Group } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";
import { initials } from "../lib/avatar";
import { InviteAgentModal } from "./InviteAgentModal";

type Tab = "agents" | "chatbots" | "groups" | "suspended";
const MANAGE_ROLES = ["Owner", "Admin"];

const TABS: { id: Tab; label: string }[] = [
  { id: "agents", label: "Agents" },
  { id: "chatbots", label: "Chatbots" },
  { id: "groups", label: "Groups" },
  { id: "suspended", label: "Suspended agents" },
];

export function TeamPage() {
  const { session } = useAgentAuth();
  const { agents, refreshAgents, conversations, onlineAgentIds, myRole, groups, refreshGroups } =
    useOutletContext<AgentOutletContext>();

  const canManage = MANAGE_ROLES.includes(myRole);

  const [tab, setTab] = useState<Tab>("agents");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
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

        {tab === "groups" ? (
          <GroupsTab
            groups={groups}
            agents={agents}
            canManage={canManage}
            onCreate={() => setShowAddGroupModal(true)}
            onDelete={async (g) => {
              if (!session) return;
              if (!confirm(`Delete group "${g.name}"?`)) return;
              await deleteGroup(session.token, g.id);
              refreshGroups();
              refreshAgents();
            }}
          />
        ) : tab !== "agents" ? (
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
              {canManage && (
                <button className="send-btn" onClick={() => setShowAddModal(true)}>
                  <HugeiconsIcon icon={UserAdd01Icon} size={15} />
                  Invite agents
                </button>
              )}
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
                {filtered.map((a) => {
                  const online = onlineAgentIds.has(a.id);
                  return (
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
                        <span className={`presence-dot ${online ? "online" : "offline"}`} />
                        {online ? "Accepting chats" : "Offline"}
                        {canManage && (
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === a.id ? null : a.id);
                            }}
                          >
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                          </button>
                        )}
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
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {selected && tab === "agents" && (
        <AgentDetailsPanel
          agent={selected}
          totalChats={conversations.filter((c) => c.assignedAgentId === selected.id).length}
          online={onlineAgentIds.has(selected.id)}
          canManage={canManage}
          groups={groups}
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
          onGroupChange={async (groupId) => {
            if (!session) return;
            await updateAgent(session.token, selected.id, { groupId });
            refreshAgents();
          }}
        />
      )}

      {showAddModal && (
        <InviteAgentModal
          onClose={() => setShowAddModal(false)}
          onCreate={async (data) => {
            if (!session) return;
            await createAgent(session.token, data);
            setShowAddModal(false);
            refreshAgents();
          }}
        />
      )}

      {showAddGroupModal && (
        <AddGroupModal
          onClose={() => setShowAddGroupModal(false)}
          onCreate={async (name) => {
            if (!session) return;
            await createGroup(session.token, name);
            setShowAddGroupModal(false);
            refreshGroups();
          }}
        />
      )}
    </div>
  );
}

function GroupsTab({
  groups,
  agents,
  canManage,
  onCreate,
  onDelete,
}: {
  groups: Group[];
  agents: Agent[];
  canManage: boolean;
  onCreate: () => void;
  onDelete: (g: Group) => void;
}) {
  return (
    <div className="team-table">
      <div className="team-toolbar" style={{ padding: "16px 0" }}>
        <div className="team-table-title" style={{ marginBottom: 0 }}>
          Groups ({groups.length})
        </div>
        {canManage && (
          <button className="send-btn" onClick={onCreate}>
            <HugeiconsIcon icon={PlusSignIcon} size={15} />
            New group
          </button>
        )}
      </div>
      <div className="team-rows">
        {groups.map((g) => (
          <div key={g.id} className="team-row" style={{ gridTemplateColumns: "1fr 160px" }}>
            <div className="team-row-name">
              <div>
                <div className="visitor-name">{g.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {agents.filter((a) => a.groupId === g.id).length} member(s)
                </div>
              </div>
            </div>
            {canManage && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="icon-btn" onClick={() => onDelete(g)}>
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && <p className="muted" style={{ padding: "12px 0" }}>No groups yet.</p>}
      </div>
    </div>
  );
}

function AgentDetailsPanel({
  agent,
  totalChats,
  online,
  canManage,
  groups,
  editing,
  onStartEdit,
  onClose,
  onSave,
  onGroupChange,
}: {
  agent: Agent;
  totalChats: number;
  online: boolean;
  canManage: boolean;
  groups: Group[];
  editing: boolean;
  onStartEdit: () => void;
  onClose: () => void;
  onSave: (data: { name: string; title: string | null; role?: string }) => Promise<void>;
  onGroupChange: (groupId: string | null) => void;
}) {
  const [name, setName] = useState(agent.name);
  const [title, setTitle] = useState(agent.title ?? "");
  const [role, setRole] = useState(agent.role);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name: name.trim(), title: title.trim() || null, role: canManage ? role : undefined });
    } finally {
      setSaving(false);
    }
  }

  const currentGroup = groups.find((g) => g.id === agent.groupId);

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
          {canManage && (
            <label className="muted" style={{ fontSize: 12 }}>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Agent">Agent</option>
              </select>
            </label>
          )}
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

          {canManage && (
            <button className="add-attribute-btn" onClick={onStartEdit} style={{ marginBottom: 8 }}>
              <HugeiconsIcon icon={PencilEditIcon} size={14} />
              Edit details
            </button>
          )}

          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Chat limit</span>
              <span className="info-field-value">Unlimited</span>
            </span>
          </div>
          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Login status</span>
              <span className="info-field-value">{online ? "Online now" : "Offline"}</span>
            </span>
          </div>
          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Last seen</span>
              <span className="info-field-value">
                {online ? "Just now" : agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : "—"}
              </span>
            </span>
          </div>

          <div className="notes-section">
            <div className="notes-section-title">Group</div>
            {canManage ? (
              <select
                value={agent.groupId ?? ""}
                onChange={(e) => onGroupChange(e.target.value || null)}
                style={{ width: "100%" }}
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="muted" style={{ fontSize: 12 }}>{currentGroup?.name ?? "No group"}</p>
            )}
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

function AddGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="customer-info-header">
          <h3 style={{ flex: 1 }}>New group</h3>
          <button className="icon-btn" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="muted" style={{ fontSize: 12 }}>
            Group name
            <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", marginTop: 4 }} />
          </label>
          {error && <p className="error">{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="send-btn" disabled={busy}>
              {busy ? "Creating…" : "Create group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
