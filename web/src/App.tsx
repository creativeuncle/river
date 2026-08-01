import { Navigate, Route, Routes } from "react-router-dom";
import { GridViewIcon, Home01Icon, Megaphone01Icon, Robot01Icon } from "@hugeicons/core-free-icons";
import { DemoSitePage } from "./widget/DemoSitePage";
import { WidgetEmbedPage } from "./widget/WidgetEmbedPage";
import { AgentLoginPage } from "./agent/AgentLoginPage";
import { OnboardingPage } from "./agent/OnboardingPage";
import { AgentLayout } from "./agent/AgentLayout";
import { AgentDashboardPage } from "./agent/AgentDashboardPage";
import { TeamPage } from "./agent/TeamPage";
import { SettingsPage } from "./agent/SettingsPage";
import { ReportsPage } from "./agent/ReportsPage";
import { ArchivesPage } from "./agent/ArchivesPage";
import { BillingPage } from "./agent/BillingPage";
import { ComingSoonPage } from "./agent/ComingSoonPage";
import { useAgentAuth } from "./agent/AgentAuthContext";
import { SuperAdminPage } from "./superadmin/SuperAdminPage";
import { SuperAdminAccountPage } from "./superadmin/SuperAdminAccountPage";

function RequireAgent({ children }: { children: React.ReactNode }) {
  const { session } = useAgentAuth();
  if (!session) return <Navigate to="/agent/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<DemoSitePage />} />
      <Route path="/widget-embed" element={<WidgetEmbedPage />} />
      <Route path="/agent/login" element={<AgentLoginPage />} />
      <Route
        path="/agent/onboarding"
        element={
          <RequireAgent>
            <OnboardingPage />
          </RequireAgent>
        }
      />
      <Route
        path="/agent"
        element={
          <RequireAgent>
            <AgentLayout />
          </RequireAgent>
        }
      >
        <Route index element={<AgentDashboardPage />} />
        <Route
          path="home"
          element={<ComingSoonPage title="Home" description="Your daily overview is coming soon." icon={Home01Icon} />}
        />
        <Route
          path="engage"
          element={
            <ComingSoonPage
              title="Engage"
              description="Turn on the proactive 'Need help?' popup from Settings → Engage."
              icon={Megaphone01Icon}
            />
          }
        />
        <Route
          path="automate"
          element={
            <ComingSoonPage title="Automate" description="Chatbots and automation rules are coming soon." icon={Robot01Icon} />
          }
        />
        <Route path="archives" element={<ArchivesPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="apps"
          element={
            <ComingSoonPage
              title="Apps"
              description="Webhooks (Zapier-style) are available under Settings. More integrations are coming soon."
              icon={GridViewIcon}
            />
          }
        />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route
        path="/superadmin"
        element={
          <RequireAgent>
            <SuperAdminPage />
          </RequireAgent>
        }
      />
      <Route
        path="/superadmin/accounts/:id"
        element={
          <RequireAgent>
            <SuperAdminAccountPage />
          </RequireAgent>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
