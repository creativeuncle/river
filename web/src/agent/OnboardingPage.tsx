import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyIcon, CheckmarkCircle01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { fetchAgentWidgetSettings, updateAgent } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import { RiverLogo } from "../components/RiverLogo";

const TOTAL_STEPS = 4;

function ProgressDashes({ step }: { step: number }) {
  return (
    <div className="onboarding-progress">
      <span className="onboarding-progress-label">{step}/{TOTAL_STEPS}</span>
      <div className="onboarding-progress-dashes">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`onboarding-dash ${i < step ? "filled" : ""}`} />
        ))}
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const { session, login } = useAgentAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(session?.name ?? "");
  const [website, setWebsite] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    if (!session) return;
    fetchAgentWidgetSettings(session.token).then((r) => setSiteId(r.siteId));
  }, [session]);

  const embedSnippet = `<!-- Start of River widget -->\n<script>\n  window.__river = window.__river || {};\n  window.__river.siteId = "${siteId}";\n</script>\n<script src="${window.location.origin}/widget.js" async></script>\n<!-- End of River widget -->`;

  async function onNameContinue() {
    if (!session || !name.trim()) return;
    setSaving(true);
    try {
      await updateAgent(session.token, session.agentId, { name: name.trim() });
      login({ ...session, name: name.trim() });
      setStep(2);
    } finally {
      setSaving(false);
    }
  }

  function onCopyCode() {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!session) return null;

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <RiverLogo className="auth-topbar-logo" />
      </header>

      <div className="onboarding-card">
        <ProgressDashes step={step} />

        {step === 1 && (
          <>
            <h1>Hi, what's your name?</h1>
            <p className="auth-subtitle">This is how customers and your team will see you.</p>
            <input
              className="onboarding-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button type="button" className="auth-submit dark" disabled={saving || !name.trim()} onClick={onNameContinue}>
              {saving ? "Please wait…" : "Continue"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Automate your customer service</h1>
            <label className="onboarding-label">
              Enter your website
              <input
                className="onboarding-input"
                placeholder="yourwebsite.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                autoFocus
              />
            </label>
            <p className="onboarding-hint">
              We'll show you how to <strong>automatically</strong> handle customer questions using your website's public
              content.
            </p>
            <button type="button" className="auth-submit dark" onClick={() => setStep(3)}>
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Start using River on your website now</h1>
            <div className="embed-card">
              <div className="embed-card-head">
                <HugeiconsIcon icon={CopyIcon} size={16} />
                <strong>Add the code manually</strong>
              </div>
              <p className="onboarding-hint">Paste the code before the &lt;/body&gt; tag on every page.</p>
              <pre className="embed-code">{embedSnippet}</pre>
              <button type="button" className="embed-copy-btn" onClick={onCopyCode}>
                <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : CopyIcon} size={15} />
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
            <button type="button" className="auth-submit dark" onClick={() => setStep(4)}>
              Continue
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h1>How else would you like to connect with your customers?</h1>
            <p className="auth-subtitle">Select the channels you'd like to use to stay in touch with customers.</p>
            <div className="channel-grid">
              <button
                type="button"
                className={`channel-option ${whatsapp ? "selected" : ""}`}
                onClick={() => setWhatsapp((v) => !v)}
              >
                <span className={`channel-checkbox ${whatsapp ? "checked" : ""}`} />
                <HugeiconsIcon icon={WhatsappIcon} size={20} color="#25D366" />
                WhatsApp
              </button>
            </div>
            <button type="button" className="auth-submit dark" onClick={() => navigate("/agent/home")}>
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
