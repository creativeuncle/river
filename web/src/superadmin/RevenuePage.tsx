import { useEffect, useState } from "react";
import { fetchSuperAdminSummary, type SuperAdminSummary } from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";

export function RevenuePage() {
  const { session } = useAgentAuth();
  const [summary, setSummary] = useState<SuperAdminSummary | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchSuperAdminSummary(session.token).then(setSummary);
  }, [session]);

  if (!summary) return null;

  const maxRevenue = Math.max(1, ...summary.planBreakdown.map((p) => p.count * p.price));

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-xl font-semibold">Revenue</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Estimated from list prices — no real payment gateway is wired up yet.
      </p>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Monthly recurring revenue</p>
        <p className="mt-1 text-4xl font-semibold">${summary.mrr.toLocaleString()}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">across {summary.totalAccounts} clients</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--text-secondary)]">Revenue by plan</h2>
      <div className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        {summary.planBreakdown.map((p) => {
          const revenue = p.count * p.price;
          const pct = Math.round((revenue / maxRevenue) * 100);
          return (
            <div key={p.plan}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.plan}</span>
                <span className="text-[var(--text-secondary)]">
                  ${revenue.toLocaleString()} · {p.count} client{p.count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-alt)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
