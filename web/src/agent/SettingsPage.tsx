import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import {
  createWebhook,
  deleteWebhook,
  fetchAgentWidgetSettings,
  fetchWebhooks,
  resolveAssetUrl,
  updateWebhook,
  updateWidgetSettings,
  uploadFile,
  type Webhook,
  type WidgetSettings,
} from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";

type Tab = "widget" | "notifications" | "webhooks";

const TABS: { id: Tab; label: string }[] = [
  { id: "widget", label: "Widget settings" },
  { id: "notifications", label: "Offline Notifications" },
  { id: "webhooks", label: "Webhooks" },
];

function WebhooksSection({ token }: { token: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetchWebhooks(token).then((r) => {
      setWebhooks(r.webhooks);
      setAvailableEvents(r.availableEvents);
    });
  }

  useEffect(refresh, [token]);

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || events.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createWebhook(token, { url: url.trim(), events });
      setUrl("");
      setEvents([]);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add webhook");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleEnabled(hook: Webhook) {
    await updateWebhook(token, hook.id, { enabled: !hook.enabled });
    refresh();
  }

  async function onDelete(hook: Webhook) {
    if (!confirm(`Remove webhook to ${hook.url}?`)) return;
    await deleteWebhook(token, hook.id);
    refresh();
  }

  return (
    <div className="settings-tab-panel">
      <p className="muted" style={{ marginBottom: 16 }}>
        Notify an external URL (e.g. a Zapier catch hook) when a conversation starts, closes, or gets a new message.
      </p>

      {webhooks.length > 0 && (
        <div className="webhook-list">
          {webhooks.map((w) => (
            <div className="webhook-row" key={w.id}>
              <div>
                <div className="webhook-url">{w.url}</div>
                <div className="muted" style={{ fontSize: 12 }}>{w.events.join(", ")}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" onClick={() => onToggleEnabled(w)}>
                  {w.enabled ? "Enabled" : "Disabled"}
                </button>
                <button type="button" onClick={() => onDelete(w)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onAdd} className="webhook-form">
        <input placeholder="https://hooks.zapier.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="webhook-events">
          {availableEvents.map((e) => (
            <label key={e} className="webhook-event-check">
              <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} />
              {e}
            </label>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="send-btn" disabled={busy || !url.trim() || events.length === 0}>
          Add webhook
        </button>
      </form>
    </div>
  );
}

export function SettingsPage() {
  const { session } = useAgentAuth();
  const { myRole } = useOutletContext<AgentOutletContext>();
  const [tab, setTab] = useState<Tab>("widget");
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchAgentWidgetSettings(session.token).then((r) => {
      setSettings(r.settings);
      setIsEmailConfigured(r.isEmailConfigured);
    });
  }, [session]);

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
        proactiveMessageEnabled: settings.proactiveMessageEnabled,
        proactiveMessageText: settings.proactiveMessageText,
        proactiveMessageDelaySeconds: settings.proactiveMessageDelaySeconds,
        notifyEmail: settings.notifyEmail,
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
        whatsappNotificationsEnabled: settings.whatsappNotificationsEnabled,
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

  const SaveRow = (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
      <button type="submit" className="send-btn" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
      {saved && <span className="muted">Saved ✓</span>}
    </div>
  );

  return (
    <div className="settings-page-wide">
      <header className="team-page-header">
        <h2>Settings</h2>
      </header>

      <div className="team-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`team-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "webhooks" ? (
        session && <WebhooksSection token={session.token} />
      ) : (
        <form onSubmit={onSubmit} className="settings-tab-panel settings-form">
          {tab === "widget" && (
            <>
              <div className="settings-grid-2">
                <label>
                  Company name
                  <input
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </label>

                <label>
                  Widget position
                  <select
                    value={settings.position}
                    onChange={(e) => setSettings({ ...settings, position: e.target.value as "left" | "right" })}
                  >
                    <option value="right">Bottom right</option>
                    <option value="left">Bottom left</option>
                  </select>
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
                  Logo
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {settings.logoUrl && (
                      <img
                        src={resolveAssetUrl(settings.logoUrl)}
                        alt="Logo"
                        style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }}
                      />
                    )}
                    <input type="file" accept="image/*" onChange={onLogoPick} />
                  </div>
                </label>
              </div>

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

              <div className="settings-section">
                <h3>Engage: proactive message</h3>
                <label className="settings-toggle-row">
                  <input
                    type="checkbox"
                    checked={settings.proactiveMessageEnabled}
                    onChange={(e) => setSettings({ ...settings, proactiveMessageEnabled: e.target.checked })}
                  />
                  Show a proactive "Need help?" bubble if the visitor hasn't opened the widget yet
                </label>
                {settings.proactiveMessageEnabled && (
                  <div className="settings-grid-2">
                    <label>
                      Message text
                      <input
                        value={settings.proactiveMessageText}
                        onChange={(e) => setSettings({ ...settings, proactiveMessageText: e.target.value })}
                      />
                    </label>
                    <label>
                      Delay before showing (seconds)
                      <input
                        type="number"
                        min={3}
                        max={300}
                        value={settings.proactiveMessageDelaySeconds}
                        onChange={(e) =>
                          setSettings({ ...settings, proactiveMessageDelaySeconds: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>

              {error && <p className="error">{error}</p>}
              {SaveRow}
            </>
          )}

          {tab === "notifications" && (
            <>
              <p className="muted" style={{ marginBottom: 8 }}>
                Get notified when a customer messages in and no agent is currently online.
              </p>
              <label className="settings-toggle-row">
                <input
                  type="checkbox"
                  checked={settings.emailNotificationsEnabled}
                  onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                  disabled={!isEmailConfigured}
                />
                Email notifications{" "}
                {!isEmailConfigured && (
                  <span className="muted">(not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS)</span>
                )}
              </label>
              {settings.emailNotificationsEnabled && isEmailConfigured && (
                <label>
                  Notify email address
                  <input
                    type="email"
                    value={settings.notifyEmail ?? ""}
                    onChange={(e) => setSettings({ ...settings, notifyEmail: e.target.value })}
                  />
                </label>
              )}
              <label className="settings-toggle-row" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={false} disabled title="Coming soon" />
                WhatsApp notifications <span className="muted">(coming soon)</span>
              </label>

              {error && <p className="error">{error}</p>}
              {SaveRow}
            </>
          )}
        </form>
      )}
    </div>
  );
}
