import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Building06Icon,
  CreditCardIcon,
  ChartUpIcon,
  Logout03Icon,
  ArrowLeft02Icon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons";
import { useAgentAuth } from "../agent/AgentAuthContext";
import { RiverLogo } from "../components/RiverLogo";
import { initials } from "../lib/avatar";
import "./superadmin.css";

const NAV_ITEMS = [
  { to: "/superadmin", end: true, label: "Overview", icon: DashboardSquare01Icon },
  { to: "/superadmin/clients", end: false, label: "Clients", icon: Building06Icon },
  { to: "/superadmin/billing", end: false, label: "Billing", icon: CreditCardIcon },
  { to: "/superadmin/revenue", end: false, label: "Revenue", icon: ChartUpIcon },
];

export function SuperAdminLayout() {
  const { session, logout } = useAgentAuth();
  const navigate = useNavigate();

  if (!session) return <Navigate to="/agent/login" replace />;
  if (!session.isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <div className="text-center">
          <p className="mb-3 text-[var(--text-secondary)]">You don't have permission to view this page.</p>
          <button
            type="button"
            onClick={() => navigate("/agent")}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 px-5 py-5">
          <RiverLogo className="h-6 w-auto" />
        </div>
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-[var(--surface-alt)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
          <HugeiconsIcon icon={ShieldUserIcon} size={15} />
          Super Admin
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              // index.css sets a global `a { color: var(--accent) }` that (being
              // unlayered) always beats Tailwind's @layer utilities text-color
              // classes, no matter the specificity — so the active/inactive
              // colors here are set inline, which always wins.
              style={({ isActive }) => ({ color: isActive ? "var(--accent-contrast)" : "var(--text-secondary)" })}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-[var(--accent)]" : "hover:bg-[var(--surface-hover)]"
                }`
              }
            >
              <HugeiconsIcon icon={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <button
            type="button"
            onClick={() => navigate("/agent")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
            Agent dashboard
          </button>
          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-contrast)]">
              {initials(session.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{session.name}</span>
            <button type="button" onClick={logout} aria-label="Log out" className="shrink-0 rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]">
              <HugeiconsIcon icon={Logout03Icon} size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
