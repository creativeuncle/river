import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, StickyNote01Icon } from "@hugeicons/core-free-icons";
import { addNote, fetchNotes, type Conversation, type ConversationNote } from "../lib/api";
import { initials } from "../lib/avatar";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";

// Highlights "@Full Name" mentions inline within note text.
function renderNoteText(text: string, agentNames: string[]) {
  if (agentNames.length === 0) return text;
  const pattern = new RegExp(`@(${agentNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) => (agentNames.includes(part) ? <mark key={i}>@{part}</mark> : part));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function CustomerInfoPanel({ conversation }: { conversation: Conversation }) {
  const { session } = useAgentAuth();
  const { socket, agents } = useOutletContext<AgentOutletContext>();
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!session) return;
    fetchNotes(session.token, conversation.id).then((r) => setNotes(r.notes));
  }, [session, conversation.id]);

  useEffect(() => {
    if (!socket) return;
    const onNoteNew = (note: ConversationNote) => {
      if (note.conversationId !== conversation.id) return;
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
    };
    socket.on("note:new", onNoteNew);
    return () => {
      socket.off("note:new", onNoteNew);
    };
  }, [socket, conversation.id]);

  useEffect(() => {
    if (conversation.status !== "OPEN") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [conversation.status]);

  const mentionMatch = noteText.match(/@([a-zA-Z ]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    return agents.filter((a) => a.name.toLowerCase().includes(mentionQuery)).slice(0, 6);
  }, [mentionQuery, agents]);

  function insertMention(name: string) {
    setNoteText((t) => t.replace(/@([a-zA-Z ]*)$/, `@${name} `));
    textareaRef.current?.focus();
  }

  async function submitNote() {
    if (!session || !noteText.trim()) return;
    const text = noteText.trim();
    setNoteText("");
    const { note } = await addNote(session.token, conversation.id, text);
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
  }

  const agentNames = agents.map((a) => a.name);
  const startedAt = conversation.createdAt ? new Date(conversation.createdAt).getTime() : null;
  const endedAt = conversation.status === "CLOSED" ? new Date(conversation.updatedAt).getTime() : now;
  const duration = startedAt ? formatDuration(endedAt - startedAt) : null;

  return (
    <div className="customer-info-panel">
      <div className="customer-info-header">
        <div className="agent-avatar">{initials(conversation.visitorName || "G U")}</div>
        <div>
          <div className="name">{conversation.visitorName || "Anonymous"}</div>
          {conversation.visitorEmail && (
            <div className="muted" style={{ fontSize: 12 }}>
              {conversation.visitorEmail}
            </div>
          )}
        </div>
      </div>

      <details className="info-section" open>
        <summary>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="chevron" />
          Additional info
        </summary>
        <div className="info-section-body">
          {duration && (
            <div className="info-field">
              <span className="info-field-text">
                <span className="info-field-label">Chat duration</span>
                <span className="info-field-value">{duration}</span>
              </span>
            </div>
          )}
          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Status</span>
              <span className={`status-pill ${conversation.status.toLowerCase()}`}>{conversation.status}</span>
            </span>
          </div>
          <div className="info-field">
            <span className="info-field-text">
              <span className="info-field-label">Assigned to</span>
              <span className="info-field-value">{conversation.assignedAgent?.name ?? "Unassigned"}</span>
            </span>
          </div>
        </div>
      </details>

      <details className="info-section">
        <summary>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="chevron" />
          <HugeiconsIcon icon={StickyNote01Icon} size={14} />
          Notes {notes.length > 0 && <span className="row-count">{notes.length}</span>}
        </summary>
        <div className="info-section-body">
          <div style={{ position: "relative" }}>
            {mentionQuery !== null && mentionCandidates.length > 0 && (
              <div className="canned-popover" style={{ bottom: "auto", top: "100%", marginTop: 4 }}>
                {mentionCandidates.map((a) => (
                  <button type="button" key={a.id} className="canned-popover-item" onClick={() => insertMention(a.name)}>
                    <span className="canned-title">@{a.name}</span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="note-input"
              placeholder="Write a note… use @name to mention a teammate (visible to agents only, not the customer)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitNote();
                }
              }}
            />
          </div>
          {notes.map((n) => (
            <div className="note-item" key={n.id}>
              <div className="note-item-head">
                <span className="note-item-author">{n.agent.name}</span>
                <span>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <div>{renderNoteText(n.text, agentNames)}</div>
            </div>
          ))}
          {notes.length === 0 && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>No notes yet.</p>}
        </div>
      </details>
    </div>
  );
}
