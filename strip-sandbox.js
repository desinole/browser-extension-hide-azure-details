// Runs at document_start in the MAIN world (page's JS context).
// Intercepts sandbox attribute at the prototype level so it is
// never applied to iframes. This must run in MAIN world because
// the page's JavaScript (React) creates iframes via createElement
// and sets sandbox via setAttribute / the .sandbox property.
// Without this, Chromium blocks content script injection into
// sandboxed iframes.
// Runs at document_start in the MAIN world (page's JS context).
// Intercepts sandbox attribute at the prototype level so it is
// never applied to iframes. This must run in MAIN world because
// the page's JavaScript (React) creates iframes via createElement
// and sets sandbox via setAttribute / the .sandbox property.
// Without this, Chromium blocks content script injection into
// sandboxed iframes.
(() => {
  function initSandboxStripping() {
    // Intercept Element.prototype.setAttribute
    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (this.tagName === "IFRAME" && name.toLowerCase() === "sandbox") {
        return;
      }
      return origSetAttribute.call(this, name, value);
    };

    // Intercept the .sandbox property setter on HTMLIFrameElement
    const desc = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "sandbox"
    );
    if (desc) {
      Object.defineProperty(HTMLIFrameElement.prototype, "sandbox", {
        get: desc.get,
        set() {},
        configurable: true,
        enumerable: true,
      });
    }

    // Fallback: MutationObserver to catch any iframes that slip through
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === "IFRAME") node.removeAttribute("sandbox");
          if (node.querySelectorAll) {
            node
              .querySelectorAll("iframe[sandbox]")
              .forEach((f) => f.removeAttribute("sandbox"));
          }
        }
      }
    });

    const root = document.documentElement || document;
    observer.observe(root, { childList: true, subtree: true });

    return { origSetAttribute, observer };
  }

  // Auto-initialize in browser
  if (typeof module === "undefined") {
    initSandboxStripping();
  }

  // Export for testing (Node.js / Jest)
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { initSandboxStripping };
  }
})();
