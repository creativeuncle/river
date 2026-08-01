import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { fetchSuperAdminAccount, updateSuperAdminBilling, type SuperAdminAccountDetail } from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";

const PLANS: { id: string; seatLimit: number; price: number }[] = [
  { id: "Free", seatLimit: 3, price: 0 },
  { id: "Pro", seatLimit: 10, price: 49 },
  { id: "Business", seatLimit: 50, price: 199 },
];

export function ClientDetailPage() {
  const { session } = useAgentAuth();
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<SuperAdminAccountDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session || !id) return;
    fetchSuperAdminAccount(session.token, id).then((r) => setAccount(r.account));
  }, [session, id]);

  async function onSelectPlan(plan: string, seatLimit: number) {
    if (!session || !id) return;
    setSaving(true);
    try {
      await updateSuperAdminBilling(session.token, id, { plan, seatLimit });
      setAccount((prev) => (prev ? { ...prev, plan, seatLimit } : prev));
    } finally {
      setSaving(false);
    }
  }

  if (!account) return null;

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Link
        to="/superadmin/clients"
        style={{ color: "var(--text-secondary)" }}
        className="inline-flex items-center gap-1 text-sm hover:opacity-80"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} size={15} />
        All clients
      </Link>
      <h1 className="mt-3 text-xl font-semibold">{account.name}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Site ID: {account.siteId}</p>
      <p className="text-sm text-[var(--text-secondary)]">{account.conversationCount} conversations total</p>

      <h2 className="mt-8 text-sm font-semibold text-[var(--text-secondary)]">Plan</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col gap-2 rounded-xl border p-5 ${
              account.plan === p.id ? "border-[var(--accent)]" : "border-[var(--border)]"
            } bg-[var(--surface)]`}
          >
            <h3 className="font-semibold">{p.id}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Up to {p.seatLimit} agent seats · ${p.price}/mo
            </p>
            <button
              type="button"
              disabled={saving || account.plan === p.id}
              onClick={() => onSelectPlan(p.id, p.seatLimit)}
              className="mt-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:cursor-default disabled:opacity-60"
            >
              {account.plan === p.id ? "Current plan" : "Set plan"}
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--text-secondary)]">Agents</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--text-secondary)]">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {account.agents.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-5 py-3 font-medium">{a.name}</td>
                <td className="px-5 py-3">{a.email}</td>
                <td className="px-5 py-3">{a.role}</td>
                <td className="px-5 py-3 text-[var(--text-secondary)]">{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
