import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building06Icon, UserGroupIcon, MessageUser01Icon, DollarCircleIcon } from "@hugeicons/core-free-icons";
import { fetchSuperAdminSummary, type SuperAdminSummary } from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";

function StatTile({ icon, label, value }: { icon: typeof Building06Icon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <HugeiconsIcon icon={icon} size={20} />
      </span>
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { session } = useAgentAuth();
  const [summary, setSummary] = useState<SuperAdminSummary | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchSuperAdminSummary(session.token).then(setSummary);
  }, [session]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Platform-wide totals across every company on River.</p>

      {summary && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Building06Icon} label="Clients" value={String(summary.totalAccounts)} />
            <StatTile icon={UserGroupIcon} label="Total agents" value={String(summary.totalAgents)} />
            <StatTile icon={MessageUser01Icon} label="Conversations" value={String(summary.totalConversations)} />
            <StatTile icon={DollarCircleIcon} label="MRR (est.)" value={`$${summary.mrr.toLocaleString()}`} />
          </div>

          <h2 className="mt-8 text-sm font-semibold text-[var(--text-secondary)]">Plan breakdown</h2>
          <div className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {summary.planBreakdown.map((p) => (
              <div key={p.plan} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">{p.plan}</span>
                <span className="text-[var(--text-secondary)]">
                  {p.count} client{p.count === 1 ? "" : "s"} · ${p.price}/mo
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
