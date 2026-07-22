import { Navigate, Route, Routes } from "react-router-dom";
import {
  Archive01Icon,
  CreditCardIcon,
  GridViewIcon,
  Home01Icon,
  Megaphone01Icon,
  Chart01Icon,
  Robot01Icon,
} from "@hugeicons/core-free-icons";
import { DemoSitePage } from "./widget/DemoSitePage";
import { AgentLoginPage } from "./agent/AgentLoginPage";
import { AgentLayout } from "./agent/AgentLayout";
import { AgentDashboardPage } from "./agent/AgentDashboardPage";
import { TeamPage } from "./agent/TeamPage";
import { SettingsPage } from "./agent/SettingsPage";
import { ComingSoonPage } from "./agent/ComingSoonPage";
import { useAgentAuth } from "./agent/AgentAuthContext";

function RequireAgent({ children }: { children: React.ReactNode }) {
  const { session } = useAgentAuth();
  if (!session) return <Navigate to="/agent/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<DemoSitePage />} />
      <Route path="/agent/login" element={<AgentLoginPage />} />
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
              description="Proactive messages and campaigns are coming soon."
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
        <Route
          path="archives"
          element={
            <ComingSoonPage title="Archives" description="Older, closed conversations will live here." icon={Archive01Icon} />
          }
        />
        <Route path="team" element={<TeamPage />} />
        <Route
          path="reports"
          element={<ComingSoonPage title="Reports" description="Analytics and reporting are coming soon." icon={Chart01Icon} />}
        />
        <Route
          path="apps"
          element={<ComingSoonPage title="Apps" description="Integrations and apps are coming soon." icon={GridViewIcon} />}
        />
        <Route
          path="billing"
          element={<ComingSoonPage title="Billing" description="Plan and billing details are coming soon." icon={CreditCardIcon} />}
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
