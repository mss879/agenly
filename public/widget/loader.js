// AgentHub Widget Loader
// This script creates an iframe-based chat widget on any website.
// Usage: <script src="https://your-platform.com/widget/loader.js" data-deployment-key="ak_xxx" async></script>

(function () {
  "use strict";

  // Use document.currentScript (works with async scripts)
  var currentScript = document.currentScript;

  if (!currentScript) {
    // Fallback: search all scripts for our loader
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("widget/loader.js") !== -1) {
        currentScript = scripts[i];
        break;
      }
    }
  }

  if (!currentScript) {
    console.error("AgentHub: Could not find loader script");
    return;
  }

  var deploymentKey = currentScript.getAttribute("data-deployment-key");

  if (!deploymentKey) {
    console.error("AgentHub: Missing data-deployment-key attribute");
    return;
  }

  // Get the platform URL from the script src
  var scriptSrc = currentScript.src;
  var platformUrl = scriptSrc.replace("/widget/loader.js", "");

  // Prevent double initialization
  if (document.getElementById("agenthub-widget-container")) return;

  // Fetch widget config to get branding (position, colors)
  fetch(platformUrl + "/api/runtime/widget-config?deploymentKey=" + deploymentKey)
    .then(function (res) { return res.json(); })
    .then(function (config) {
      var branding = config.branding || {};
      var position = branding.widget_position || "bottom-right";
      var primaryColor = branding.primary_color || "#6366f1";
      var greeting = branding.greeting || "";

      createWidget(position, primaryColor, greeting);
    })
    .catch(function () {
      // Fallback: create widget with defaults if config fails
      createWidget("bottom-right", "#6366f1", "");
    });

  function createWidget(position, primaryColor, greeting) {
    var isLeft = position === "bottom-left";

    // Create the widget container
    var container = document.createElement("div");
    container.id = "agenthub-widget-container";
    container.style.cssText =
      "position:fixed;bottom:20px;" +
      (isLeft ? "left:20px;" : "right:20px;") +
      "z-index:999999;font-family:system-ui,-apple-system,sans-serif;";

    // Create the toggle button
    var toggleBtn = document.createElement("button");
    toggleBtn.id = "agenthub-toggle";
    toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    toggleBtn.style.cssText =
      "width:56px;height:56px;border-radius:28px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,0.3);transition:transform 0.2s,box-shadow 0.2s;background:linear-gradient(135deg," + primaryColor + "," + primaryColor + "cc);";

    toggleBtn.onmouseenter = function () {
      toggleBtn.style.transform = "scale(1.1)";
      toggleBtn.style.boxShadow = "0 6px 32px " + primaryColor + "66";
    };
    toggleBtn.onmouseleave = function () {
      toggleBtn.style.transform = "scale(1)";
      toggleBtn.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)";
    };

    // Create greeting bubble (shown before chat is opened)
    var greetingBubble = null;
    if (greeting) {
      greetingBubble = document.createElement("div");
      greetingBubble.id = "agenthub-greeting";
      greetingBubble.style.cssText =
        "display:none;position:absolute;bottom:68px;" +
        (isLeft ? "left:0;" : "right:0;") +
        "background:white;color:#1e293b;padding:12px 16px;border-radius:12px;" +
        "box-shadow:0 8px 32px rgba(0,0,0,0.15);font-size:14px;line-height:1.4;" +
        "max-width:260px;min-width:160px;animation:agenthub-greeting-in 0.3s ease-out;" +
        "cursor:default;";

      // Create greeting text
      var greetingText = document.createElement("span");
      greetingText.textContent = greeting;

      // Create dismiss button
      var dismissBtn = document.createElement("button");
      dismissBtn.innerHTML = "&times;";
      dismissBtn.style.cssText =
        "position:absolute;top:4px;right:8px;background:none;border:none;" +
        "color:#94a3b8;font-size:16px;cursor:pointer;padding:0 2px;line-height:1;";
      dismissBtn.onclick = function (e) {
        e.stopPropagation();
        greetingBubble.style.display = "none";
      };

      // Create speech-bubble tail
      var tail = document.createElement("div");
      tail.style.cssText =
        "position:absolute;bottom:-6px;" +
        (isLeft ? "left:20px;" : "right:20px;") +
        "width:12px;height:12px;background:white;transform:rotate(45deg);" +
        "box-shadow:2px 2px 4px rgba(0,0,0,0.05);";

      greetingBubble.appendChild(greetingText);
      greetingBubble.appendChild(dismissBtn);
      greetingBubble.appendChild(tail);

      // Clicking the greeting bubble opens the chat
      greetingBubble.addEventListener("click", function () {
        toggleBtn.click();
      });
    }

    // Add greeting animation keyframes
    var style = document.createElement("style");
    style.textContent =
      "@keyframes agenthub-greeting-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
    document.head.appendChild(style);

    // Create the iframe container
    var iframeContainer = document.createElement("div");
    iframeContainer.id = "agenthub-iframe-container";
    iframeContainer.style.cssText =
      "display:none;width:400px;height:600px;margin-bottom:16px;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);";

    // Create the iframe
    var iframe = document.createElement("iframe");
    iframe.src = platformUrl + "/widget/" + deploymentKey;
    iframe.style.cssText = "width:100%;height:100%;border:none;";
    iframe.allow = "microphone";
    iframe.title = "AI Chat Widget";

    iframeContainer.appendChild(iframe);
    container.appendChild(iframeContainer);
    if (greetingBubble) container.appendChild(greetingBubble);
    container.appendChild(toggleBtn);

    // Toggle logic
    var isOpen = false;
    toggleBtn.addEventListener("click", function () {
      isOpen = !isOpen;
      iframeContainer.style.display = isOpen ? "block" : "none";

      // Hide greeting bubble when chat opens
      if (isOpen && greetingBubble) {
        greetingBubble.style.display = "none";
      }

      if (isOpen) {
        toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      } else {
        toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      }
    });

    // Append to body
    function mount() {
      if (document.body) {
        document.body.appendChild(container);

        // Show greeting bubble after a delay
        if (greetingBubble) {
          setTimeout(function () {
            if (!isOpen) {
              greetingBubble.style.display = "block";
            }
          }, 2000);
        }
      } else {
        setTimeout(mount, 50);
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }
})();
