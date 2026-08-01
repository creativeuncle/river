import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSuperAdminAccounts, type SuperAdminAccountSummary } from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";

export function ClientsPage() {
  const { session } = useAgentAuth();
  const [accounts, setAccounts] = useState<SuperAdminAccountSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchSuperAdminAccounts(session.token)
      .then((r) => setAccounts(r.accounts))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load accounts"));
  }, [session]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Every company running River.</p>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {accounts && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--text-secondary)]">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Seats used</th>
                <th className="px-5 py-3">Conversations</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3 font-medium">{a.name}</td>
                  <td className="px-5 py-3">{a.plan}</td>
                  <td className="px-5 py-3">
                    {a.agentCount} / {a.seatLimit}
                  </td>
                  <td className="px-5 py-3">{a.conversationCount}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/superadmin/clients/${a.id}`} className="font-medium text-[var(--accent)] hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-secondary)]">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
