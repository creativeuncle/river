import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { GoogleIcon, AppleIcon, ViewIcon, ViewOffIcon, CheckmarkCircleIcon, CircleIcon } from "@hugeicons/core-free-icons";
import { agentLogin, agentRegister } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import { ThemeToggle } from "../theme/ThemeToggle";
import { RiverLogo } from "../components/RiverLogo";

type Step = "login" | "signup1" | "signup2";

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`password-rule ${ok ? "ok" : ""}`}>
      <HugeiconsIcon icon={ok ? CheckmarkCircleIcon : CircleIcon} size={14} />
      {label}
    </span>
  );
}

function ComingSoonButton({ icon, label }: { icon: Parameters<typeof HugeiconsIcon>[0]["icon"]; label: string }) {
  return (
    <button type="button" className="oauth-btn" title="Coming soon" disabled>
      <HugeiconsIcon icon={icon} size={17} />
      {label}
    </button>
  );
}

export function AgentLoginPage() {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login } = useAgentAuth();
  const navigate = useNavigate();

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 12,
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  async function onLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await agentLogin(email, password);
      login({ token: res.token, agentId: res.agent.id, name: res.agent.name, email: res.agent.email });
      navigate("/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onSignupStep1Submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("signup2");
  }

  async function onSignupStep2Submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError("Password does not meet the requirements below.");
      return;
    }
    setBusy(true);
    try {
      const displayName = email.split("@")[0];
      const res = await agentRegister(displayName, email, password, phone.trim() || undefined);
      login({ token: res.token, agentId: res.agent.id, name: res.agent.name, email: res.agent.email });
      navigate("/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function resetToLogin() {
    setStep("login");
    setError(null);
    setPassword("");
  }

  function resetToSignup() {
    setStep("signup1");
    setError(null);
    setPassword("");
  }

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <RiverLogo className="auth-topbar-logo" />
        <div className="auth-topbar-actions">
          <ThemeToggle />
          {step === "login" ? (
            <button type="button" className="auth-topbar-btn" onClick={resetToSignup}>
              Sign up free
            </button>
          ) : (
            <button type="button" className="auth-topbar-btn" onClick={resetToLogin}>
              Log in
            </button>
          )}
        </div>
      </header>

      <div className="auth-card">
        {step === "login" && (
          <>
            <h1>Welcome back</h1>
            <p className="auth-subtitle">Log in to your account</p>

            <div className="oauth-row">
              <ComingSoonButton icon={GoogleIcon} label="Log in with Google" />
              <ComingSoonButton icon={AppleIcon} label="Log in with Apple" />
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={onLoginSubmit}>
              <label>
                Business email
                <input
                  type="email"
                  placeholder="name@work-email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label-row">
                  Password
                  <a className="inline-link disabled" title="Coming soon">
                    Forgot password?
                  </a>
                </span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="12 characters or more"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)}>
                    <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={17} />
                  </button>
                </div>
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="auth-submit dark" disabled={busy}>
                {busy ? "Please wait…" : "Log in with email"}
              </button>
            </form>

            <p className="auth-footnote">
              Don't have an account? <a onClick={resetToSignup}>Sign up</a>
            </p>
            <p className="auth-footnote">
              <a className="inline-link disabled" title="Coming soon">
                Log in with custom SSO
              </a>
            </p>
          </>
        )}

        {step === "signup1" && (
          <>
            <h1>Get started for free</h1>
            <p className="auth-subtitle">No credit card needed</p>

            <div className="oauth-row">
              <ComingSoonButton icon={GoogleIcon} label="Sign up with Google" />
              <ComingSoonButton icon={AppleIcon} label="Sign up with Apple" />
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={onSignupStep1Submit}>
              <label>
                Business email
                <input
                  type="email"
                  placeholder="name@work-email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="auth-submit red">
                Sign up with email
              </button>
            </form>

            <p className="auth-footnote">
              Already have an account? <a onClick={resetToLogin}>Log in</a>
            </p>
            <p className="auth-terms">You agree to our Terms of Use and Privacy Policy</p>
          </>
        )}

        {step === "signup2" && (
          <>
            <h1>Get started for free</h1>
            <p className="auth-subtitle">No credit card needed</p>

            <form onSubmit={onSignupStep2Submit}>
              <label>
                Business email
                <input type="email" value={email} readOnly className="readonly-field" />
              </label>
              <label>
                Password
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Set your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)}>
                    <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={17} />
                  </button>
                </div>
              </label>
              <div className="password-checklist">
                <PasswordRule ok={passwordChecks.length} label="At least 12 characters" />
                <PasswordRule ok={passwordChecks.upper} label="Uppercase letter" />
                <PasswordRule ok={passwordChecks.number} label="Number" />
                <PasswordRule ok={passwordChecks.special} label="Special character" />
              </div>
              <label>
                Mobile phone number (optional)
                <div className="phone-field">
                  <span className="phone-flag">🇮🇳</span>
                  <input
                    type="tel"
                    placeholder="081234 56789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="auth-submit red" disabled={busy}>
                {busy ? "Please wait…" : "Create account"}
              </button>
            </form>

            <p className="auth-footnote">
              Already have an account? <a onClick={resetToLogin}>Log in</a>
            </p>
            <p className="auth-terms">You agree to our Terms of Use and Privacy Policy</p>
          </>
        )}
      </div>
    </div>
  );
}
