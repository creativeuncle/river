import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../lib/api";
import { generateRegistrationBundle } from "../lib/signalClient";
import { IndexedDbSignalStore } from "../lib/signalStore";
import { useAuth } from "../store/AuthContext";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Generate this account's Signal identity locally, in-browser, before
      // the account even exists on the server. Private keys never leave IndexedDB.
      const store = new IndexedDbSignalStore(username);
      const bundle = await generateRegistrationBundle(store);
      const res = await register({ username, password, ...bundle });
      login({ token: res.token, userId: res.user.id, username: res.user.username });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>river</h1>
      <p className="tagline">End-to-end encrypted chat</p>
      <form onSubmit={onSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
