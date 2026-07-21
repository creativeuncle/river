import { useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export function InviteAgentModal({
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
