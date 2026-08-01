import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchBilling, updateBilling, type BillingSettings } from "../lib/api";
import { useAgentAuth } from "./AgentAuthContext";
import type { AgentOutletContext } from "./AgentLayout";

const PLANS: { id: BillingSettings["plan"]; label: string; seatLimit: number; blurb: string }[] = [
  { id: "Free", label: "Free", seatLimit: 3, blurb: "Up to 3 agent seats." },
  { id: "Pro", label: "Pro", seatLimit: 10, blurb: "Up to 10 agent seats." },
  { id: "Business", label: "Business", seatLimit: 50, blurb: "Up to 50 agent seats." },
];

export function BillingPage() {
  const { session } = useAgentAuth();
  const { myRole } = useOutletContext<AgentOutletContext>();
  const canManage = ["Owner", "Admin"].includes(myRole);
  const [billing, setBilling] = useState<BillingSettings | null>(null);
  const [seatCount, setSeatCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchBilling(session.token).then((r) => {
      setBilling(r.billing);
      setSeatCount(r.seatCount);
    });
  }, [session]);

  async function onSelectPlan(plan: BillingSettings["plan"], seatLimit: number) {
    if (!session) return;
    setSaving(true);
    try {
      const { billing: updated } = await updateBilling(session.token, { plan, seatLimit });
      setBilling(updated);
    } finally {
      setSaving(false);
    }
  }

  if (!billing) return null;

  if (!canManage) {
    return (
      <div className="billing-page">
        <p className="muted">Only Owners and Admins can view billing.</p>
      </div>
    );
  }

  return (
    <div className="billing-page">
      <h2>Billing</h2>
      <p className="muted" style={{ marginBottom: 4 }}>
        Internal plan tracking only — no payment is actually charged yet.
      </p>
      <p className="muted" style={{ marginBottom: 20, fontSize: 12 }}>
        {seatCount} of {billing.seatLimit} agent seats used.
      </p>

      <div className="plan-grid">
        {PLANS.map((p) => (
          <div className={`plan-card ${billing.plan === p.id ? "active" : ""}`} key={p.id}>
            <h3>{p.label}</h3>
            <p className="muted">{p.blurb}</p>
            <button
              type="button"
              className={billing.plan === p.id ? "send-btn" : ""}
              disabled={saving || billing.plan === p.id}
              onClick={() => onSelectPlan(p.id, p.seatLimit)}
            >
              {billing.plan === p.id ? "Current plan" : "Switch"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
