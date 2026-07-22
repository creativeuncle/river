import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { agentLogin, agentRegister } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import { ThemeToggle } from "../theme/ThemeToggle";
import { RiverLogo } from "../components/RiverLogo";

export function AgentLoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login } = useAgentAuth();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = mode === "login" ? await agentLogin(email, password) : await agentRegister(name, email, password);
      login({ token: res.token, agentId: res.agent.id, name: res.agent.name, email: res.agent.email });
      navigate("/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ThemeToggle />
      </div>
      <RiverLogo className="auth-logo" />
      <p className="tagline">Agent dashboard</p>
      <form onSubmit={onSubmit}>
        {mode === "register" && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create agent account"}
        </button>
      </form>
      <p>
        {mode === "login" ? (
          <>
            No agent account? <a onClick={() => setMode("register")}>Register</a>
          </>
        ) : (
          <>
            Already have an account? <a onClick={() => setMode("login")}>Log in</a>
          </>
        )}
      </p>
    </div>
  );
}
