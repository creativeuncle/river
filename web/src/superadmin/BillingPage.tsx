import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSuperAdminAccounts, type SuperAdminAccountSummary } from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";

const PLAN_BADGE: Record<string, string> = {
  Free: "bg-[var(--surface-alt)] text-[var(--text-secondary)]",
  Pro: "bg-[var(--accent)]/10 text-[var(--accent)]",
  Business: "bg-[var(--online)]/15 text-[var(--online)]",
};

export function BillingPage() {
  const { session } = useAgentAuth();
  const [accounts, setAccounts] = useState<SuperAdminAccountSummary[] | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchSuperAdminAccounts(session.token).then((r) => setAccounts(r.accounts));
  }, [session]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Plan and seat status for every client.</p>

      {accounts && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--text-secondary)]">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Seats</th>
                <th className="px-5 py-3">Seat usage</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const pct = Math.min(100, Math.round((a.agentCount / a.seatLimit) * 100));
                return (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3 font-medium">{a.name}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE[a.plan] ?? PLAN_BADGE.Free}`}>
                        {a.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {a.agentCount} / {a.seatLimit}
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-alt)]">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/superadmin/clients/${a.id}`} className="font-medium text-[var(--accent)] hover:underline">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
