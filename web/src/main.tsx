import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AgentAuthProvider } from "./agent/AgentAuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AgentAuthProvider>
        <App />
      </AgentAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
