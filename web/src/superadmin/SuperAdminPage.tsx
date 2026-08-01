import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  fetchSuperAdminAccounts,
  type SuperAdminAccountSummary,
} from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";
import { RiverLogo } from "../components/RiverLogo";

export function SuperAdminPage() {
  const { session, logout } = useAgentAuth();
  const [accounts, setAccounts] = useState<SuperAdminAccountSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchSuperAdminAccounts(session.token)
      .then((r) => setAccounts(r.accounts))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load accounts"));
  }, [session]);

  if (!session) return <Navigate to="/agent/login" replace />;
  if (!session.isSuperAdmin) {
    return (
      <div className="superadmin-page">
        <p className="muted">You don't have permission to view this page.</p>
        <Link to="/agent">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="superadmin-page">
      <header className="superadmin-header">
        <RiverLogo className="auth-topbar-logo" />
        <div className="superadmin-header-actions">
          <Link to="/agent">Agent dashboard</Link>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <h1>Super Admin</h1>
      <p className="muted">Every company running River — plans, seats, and usage across all accounts.</p>

      {error && <p style={{ color: "#e5484d" }}>{error}</p>}

      {accounts && (
        <table className="superadmin-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Plan</th>
              <th>Seats used</th>
              <th>Conversations</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.plan}</td>
                <td>
                  {a.agentCount} / {a.seatLimit}
                </td>
                <td>{a.conversationCount}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link to={`/superadmin/accounts/${a.id}`}>Manage →</Link>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
