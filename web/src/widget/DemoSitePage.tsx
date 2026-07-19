import { Link } from "react-router-dom";
import { ChatWidget } from "./ChatWidget";

// Stands in for "any website" that has the support-chat widget embedded —
// in a real deployment this would just be a <script> snippet on the
// customer's own site, mounting the same ChatWidget bubble.
export function DemoSitePage() {
  return (
    <div className="demo-site">
      <header className="demo-site-header">
        <span>Acme Co.</span>
        <nav>
          <a>Products</a>
          <a>Pricing</a>
          <a>About</a>
        </nav>
      </header>
      <main className="demo-site-body">
        <h1>Welcome to Acme Co.</h1>
        <p className="muted">This is a stand-in storefront page — the chat bubble bottom-right is the support widget.</p>
        <p className="muted">
          <Link to="/agent/login">Agent dashboard →</Link>
        </p>
      </main>
      <ChatWidget />
    </div>
  );
}
