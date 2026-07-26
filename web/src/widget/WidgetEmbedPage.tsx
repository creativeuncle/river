import { useEffect } from "react";
import { ChatWidget } from "./ChatWidget";

// The page an embedded <iframe> from a third-party site points at (see
// public/widget.js). Renders nothing but the widget itself against a
// transparent background so only the bubble/panel shapes are visible —
// the iframe box is resized/repositioned by the host page based on
// postMessage events this widget sends (see ChatWidget's "river-widget"
// postMessage effect).
export function WidgetEmbedPage() {
  useEffect(() => {
    document.body.classList.add("widget-embed-body");
    return () => document.body.classList.remove("widget-embed-body");
  }, []);

  return <ChatWidget />;
}
