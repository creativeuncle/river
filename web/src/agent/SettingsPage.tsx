import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchWidgetSettings, updateWidgetSettings, uploadFile, type WidgetSettings } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";

export function SettingsPage() {
  const { session } = useAgentAuth();
  const { myRole } = useOutletContext<AgentOutletContext>();
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchWidgetSettings().then((r) => setSettings(r.settings));
  }, []);

  const canManage = ["Owner", "Admin"].includes(myRole);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || !settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { settings: updated } = await updateWidgetSettings(session.token, {
        companyName: settings.companyName,
        primaryColor: settings.primaryColor,
        position: settings.position,
        welcomeMessage: settings.welcomeMessage,
        awayMessage: settings.awayMessage,
        logoUrl: settings.logoUrl,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !settings) return;
    const { url } = await uploadFile(file, file.name);
    setSettings({ ...settings, logoUrl: url });
  }

  if (!settings) return null;

  if (!canManage) {
    return (
      <div className="settings-page">
        <p className="muted">Only Owners and Admins can edit widget settings.</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h2>Widget settings</h2>
      <p className="muted" style={{ marginBottom: 20 }}>
        Customize how the chat widget looks and behaves on your website.
      </p>

      <form onSubmit={onSubmit} className="settings-form">
        <label>
          Company name
          <input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
        </label>

        <label>
          Primary color
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              style={{ width: 44, height: 36, padding: 2 }}
            />
            <input
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </label>

        <label>
          Widget position
          <select value={settings.position} onChange={(e) => setSettings({ ...settings, position: e.target.value as "left" | "right" })}>
            <option value="right">Bottom right</option>
            <option value="left">Bottom left</option>
          </select>
        </label>

        <label>
          Welcome message
          <textarea
            className="note-input"
            value={settings.welcomeMessage}
            onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
          />
        </label>

        <label>
          Away message
          <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            Sent automatically to a new conversation when no agent is currently online.
          </p>
          <textarea
            className="note-input"
            value={settings.awayMessage}
            onChange={(e) => setSettings({ ...settings, awayMessage: e.target.value })}
          />
        </label>

        <label>
          Logo
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />}
            <input type="file" accept="image/*" onChange={onLogoPick} />
          </div>
        </label>

        {error && <p className="error">{error}</p>}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" className="send-btn" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="muted">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
