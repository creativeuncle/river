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

  var iframe = document.createElement("iframe");
  iframe.id = "river-widget-frame";
  iframe.src = origin + "/widget-embed";
  iframe.title = "Chat widget";
  iframe.setAttribute("allowtransparency", "true");
  iframe.style.position = "fixed";
  iframe.style.bottom = "0";
  iframe.style.right = "0";
  iframe.style.width = CLOSED_SIZE.width;
  iframe.style.height = CLOSED_SIZE.height;
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "2147483647";
  iframe.style.colorScheme = "light";

  document.body.appendChild(iframe);

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== "river-widget") return;

    if (data.type === "open") {
      iframe.style.width = OPEN_SIZE.width;
      iframe.style.height = OPEN_SIZE.height;
    } else if (data.type === "closed") {
      iframe.style.width = CLOSED_SIZE.width;
      iframe.style.height = CLOSED_SIZE.height;
    } else if (data.type === "position") {
      if (data.side === "left") {
        iframe.style.left = "0";
        iframe.style.right = "auto";
      } else {
        iframe.style.right = "0";
        iframe.style.left = "auto";
      }
    }
  });
})();
