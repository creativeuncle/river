import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEditIcon, Tag01Icon, MailIcon, CallIcon, MapPinIcon, PlusSignIcon, StickyNote01Icon } from "@hugeicons/core-free-icons";
import type { Conversation } from "../lib/api";
import { initials } from "../lib/avatar";

export interface Note {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export function CustomerInfoPanel({
  conversation,
  notes,
  onAddNote,
}: {
  conversation: Conversation;
  notes: Note[];
  onAddNote: (text: string) => void;
}) {
  const [noteText, setNoteText] = useState("");

  function submitNote() {
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText("");
  }

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
        <textarea
          className="note-input"
          placeholder="Write a note… (visible to agents only, not the customer)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitNote();
            }
          }}
        />
        {notes.map((n) => (
          <div className="note-item" key={n.id}>
            <div className="note-item-head">
              <span className="note-item-author">{n.author}</span>
              <span>{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <div>{n.text}</div>
          </div>
        ))}
        {notes.length === 0 && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>No notes yet.</p>}
      </div>
    </div>
  );
}
