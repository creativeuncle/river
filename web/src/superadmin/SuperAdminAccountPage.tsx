import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  fetchSuperAdminAccount,
  updateSuperAdminBilling,
  type SuperAdminAccountDetail,
} from "../lib/api";
import { useAgentAuth } from "../agent/AgentAuthContext";

const PLANS: { id: string; seatLimit: number }[] = [
  { id: "Free", seatLimit: 3 },
  { id: "Pro", seatLimit: 10 },
  { id: "Business", seatLimit: 50 },
];

export function SuperAdminAccountPage() {
  const { session } = useAgentAuth();
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<SuperAdminAccountDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session || !id) return;
    fetchSuperAdminAccount(session.token, id).then((r) => setAccount(r.account));
  }, [session, id]);

  if (!session) return <Navigate to="/agent/login" replace />;
  if (!session.isSuperAdmin) return <Navigate to="/agent" replace />;

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
    <div className="superadmin-page">
      <Link to="/superadmin">← All accounts</Link>
      <h1>{account.name}</h1>
      <p className="muted">Site ID: {account.siteId}</p>
      <p className="muted">{account.conversationCount} conversations total</p>

      <h2>Plan</h2>
      <div className="plan-grid">
        {PLANS.map((p) => (
          <div key={p.id} className={`plan-card ${account.plan === p.id ? "active" : ""}`}>
            <h3>{p.id}</h3>
            <p className="muted">Up to {p.seatLimit} agent seats</p>
            <button type="button" disabled={saving || account.plan === p.id} onClick={() => onSelectPlan(p.id, p.seatLimit)}>
              {account.plan === p.id ? "Current plan" : "Set plan"}
            </button>
          </div>
        ))}
      </div>

      <h2>Agents</h2>
      <table className="superadmin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {account.agents.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.email}</td>
              <td>{a.role}</td>
              <td>{new Date(a.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
