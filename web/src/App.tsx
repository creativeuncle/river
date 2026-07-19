import { Navigate, Route, Routes } from "react-router-dom";
import { DemoSitePage } from "./widget/DemoSitePage";
import { AgentLoginPage } from "./agent/AgentLoginPage";
import { AgentDashboardPage } from "./agent/AgentDashboardPage";
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
            <AgentDashboardPage />
          </RequireAgent>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
