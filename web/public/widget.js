(function () {
  var currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) return;
  var origin = new URL(currentScript.src).origin;

  if (document.getElementById("river-widget-frame")) return;

  // Sized with headroom beyond the widget's own footprint (bubble/panel +
  // their bottom/right margin) so the drop-shadow doesn't get a visible
  // hard-edged clip at the iframe boundary.
  var CLOSED_SIZE = { width: "130px", height: "130px" };
  var OPEN_SIZE = { width: "440px", height: "620px" };
  var PROACTIVE_SIZE = { width: "320px", height: "230px" };
  var MOBILE_BREAKPOINT = 480;

  var isOpen = false;
  var isProactiveVisible = false;
  var side = "right";

  var siteId = (window.__river && window.__river.siteId) || "";

  var iframe = document.createElement("iframe");
  iframe.id = "river-widget-frame";
  iframe.src = origin + "/widget-embed?siteId=" + encodeURIComponent(siteId);
  iframe.title = "Chat widget";
  iframe.setAttribute("allowtransparency", "true");
  iframe.style.position = "fixed";
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "2147483647";
  iframe.style.colorScheme = "light";

  function applyLayout() {
    iframe.style.bottom = "0";
    if (isOpen && window.innerWidth <= MOBILE_BREAKPOINT) {
      // Full-screen on small viewports, matching the widget's own
      // @media (max-width: 480px) panel styling.
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.right = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      return;
    }

    iframe.style.top = "auto";
    if (side === "left") {
      iframe.style.left = "0";
      iframe.style.right = "auto";
    } else {
      iframe.style.right = "0";
      iframe.style.left = "auto";
    }

    var size = isOpen ? OPEN_SIZE : isProactiveVisible ? PROACTIVE_SIZE : CLOSED_SIZE;
    iframe.style.width = size.width;
    iframe.style.height = size.height;
  }

  applyLayout();
  document.body.appendChild(iframe);
  window.addEventListener("resize", applyLayout);

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== "river-widget") return;

    if (data.type === "open") {
      isOpen = true;
    } else if (data.type === "closed") {
      isOpen = false;
    } else if (data.type === "proactive") {
      isProactiveVisible = Boolean(data.visible);
    } else if (data.type === "position") {
      side = data.side === "left" ? "left" : "right";
    } else {
      return;
    }
    applyLayout();
  });
})();
