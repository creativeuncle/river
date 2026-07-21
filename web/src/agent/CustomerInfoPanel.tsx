import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEditIcon, Tag01Icon, MailIcon, CallIcon, MapPinIcon, PlusSignIcon, StickyNote01Icon } from "@hugeicons/core-free-icons";
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

export function CustomerInfoPanel({ conversation }: { conversation: Conversation }) {
  const { session } = useAgentAuth();
  const { socket, agents } = useOutletContext<AgentOutletContext>();
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [noteText, setNoteText] = useState("");
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

  return (
    <div className="customer-info-panel">
      <div className="customer-info-header">
        <div className="agent-avatar">{initials(conversation.visitorName || "G U")}</div>
        <span className="name">{conversation.visitorName || "Anonymous"}</span>
        <button className="icon-btn" title="Edit contact details (coming soon)">
          <HugeiconsIcon icon={PencilEditIcon} size={15} />
        </button>
      </div>

      <div className="info-field">
        <span className="row-icon">
          <HugeiconsIcon icon={Tag01Icon} size={15} />
        </span>
        <div className="info-field-text">
          <span className="info-field-label">Channel</span>
          <span className="info-field-value">Web widget</span>
        </div>
      </div>

      <div className="info-field">
        <span className="row-icon" style={{ fontSize: 11 }}>
          ID
        </span>
        <div className="info-field-text">
          <span className="info-field-label">Conversation id</span>
          <span className="info-field-value mono">{conversation.id.slice(0, 18)}…</span>
        </div>
      </div>

      <div className="info-field">
        <span className="row-icon">
          <HugeiconsIcon icon={MailIcon} size={15} />
        </span>
        <div className="info-field-text">
          <span className="info-field-label">Email</span>
          <span className="info-field-value">{conversation.visitorEmail || "—"}</span>
        </div>
      </div>

      <div className="info-field">
        <span className="row-icon">
          <HugeiconsIcon icon={CallIcon} size={15} />
        </span>
        <div className="info-field-text">
          <span className="info-field-label">Phone number</span>
          <span className="info-field-value">—</span>
        </div>
      </div>

      <div className="info-field">
        <span className="row-icon">
          <HugeiconsIcon icon={MapPinIcon} size={15} />
        </span>
        <div className="info-field-text">
          <span className="info-field-label">Address</span>
          <span className="info-field-value">—</span>
        </div>
      </div>

      <button className="add-attribute-btn" title="Custom attributes — coming soon">
        <HugeiconsIcon icon={PlusSignIcon} size={14} />
        Add new attribute
      </button>

      <div className="notes-section">
        <div className="notes-section-title">
          <HugeiconsIcon icon={StickyNote01Icon} size={15} />
          Notes
        </div>
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
    </div>
  );
}
