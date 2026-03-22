(() => {
  "use strict";

  const CUSTOM_BLUR_CLASS = "custom-blur-hidden";
  let lastRightClickedElement = null;
  let cachedFields = [];
  let debounceTimer;
  let retryTimers = [];

  // ── Helpers ──────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("custom-blur-styles")) return;
    const style = document.createElement("style");
    style.id = "custom-blur-styles";
    style.textContent =
      ".custom-blur-hidden { filter: blur(8px); user-select: none; }";
    (document.head || document.documentElement).appendChild(style);
  }

  function getDomain() {
    return window.location.hostname;
  }

  /** Apply blur to elements matching cached selectors. */
  function applyBlur(root) {
    if (cachedFields.length === 0) return;
    injectStyles();
    cachedFields.forEach((field) => {
      let matched = false;

      // Primary: try the CSS selector
      try {
        const els = (root || document).querySelectorAll(field.selector);
        if (els.length > 0) {
          els.forEach((el) => el.classList.add(CUSTOM_BLUR_CLASS));
          matched = true;
        }
      } catch (_) {}

      // Fallback: match by tag + text content when selector fails
      if (!matched && field.textContent && field.tag) {
        try {
          const candidates = (root || document).querySelectorAll(field.tag);
          candidates.forEach((el) => {
            const own = getOwnText(el);
            if (own && own === field.textContent) {
              el.classList.add(CUSTOM_BLUR_CLASS);
            }
          });
        } catch (_) {}
      }
    });
  }

  /** Remove custom blur from every element on the page. */
  function removeAllCustomBlur() {
    document.querySelectorAll(`.${CUSTOM_BLUR_CLASS}`).forEach((el) => {
      el.classList.remove(CUSTOM_BLUR_CLASS);
    });
  }

  /** Read stored fields for the current domain and apply blur with retries. */
  function loadAndApply() {
    const domain = getDomain();
    chrome.storage.local.get({ customHiddenFields: {} }, (data) => {
      cachedFields = data.customHiddenFields[domain] || [];
      applyBlur();

      // Retry a few times for SPAs that render content after document_idle
      clearRetryTimers();
      [500, 1500, 3000].forEach((delay) => {
        retryTimers.push(setTimeout(() => applyBlur(), delay));
      });
    });
  }

  function clearRetryTimers() {
    retryTimers.forEach((t) => clearTimeout(t));
    retryTimers = [];
  }

  /** Persist a new hidden-field entry and update the local cache. */
  function saveHiddenField(selector, label, el) {
    const domain = getDomain();
    const tag = el ? el.tagName.toLowerCase() : "";
    const textContent = el ? getOwnText(el) : "";

    chrome.storage.local.get({ customHiddenFields: {} }, (data) => {
      const fields = data.customHiddenFields;
      if (!fields[domain]) fields[domain] = [];
      if (!fields[domain].some((f) => f.selector === selector)) {
        fields[domain].push({ selector, label, tag, textContent });
        cachedFields = fields[domain];
        chrome.storage.local.set({ customHiddenFields: fields });
      }
    });
  }

  // ── Event listeners ─────────────────────────────────────────────────

  // Remember which element was right-clicked
  document.addEventListener(
    "contextmenu",
    (e) => {
      lastRightClickedElement = e.target;
    },
    true
  );

  // Handle "Hide this field" from the background service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "hideClickedElement" && lastRightClickedElement) {
      const el = lastRightClickedElement;
      const selector = generateSelector(el);
      const label = generateLabel(el);

      injectStyles();
      try {
        document.querySelectorAll(selector).forEach((node) => {
          node.classList.add(CUSTOM_BLUR_CLASS);
        });
      } catch (_) {
        el.classList.add(CUSTOM_BLUR_CLASS);
      }

      saveHiddenField(selector, label, el);
      lastRightClickedElement = null;
    }
  });

  // ── Initialisation ──────────────────────────────────────────────────

  loadAndApply();

  // Re-apply blur when the SPA adds new DOM nodes
  const observer = new MutationObserver((mutations) => {
    if (cachedFields.length === 0) return;

    // Apply immediately to each added subtree
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyBlur(node);
        }
      }
    }

    // Also do a full-document sweep after mutations settle
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyBlur(), 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Refresh when a field is removed via the popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.customHiddenFields) {
      removeAllCustomBlur();
      const updated = changes.customHiddenFields.newValue || {};
      cachedFields = updated[getDomain()] || [];
      applyBlur();
    }
  });

  // ── Exports (testing only) ─────────────────────────────────────────

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      CUSTOM_BLUR_CLASS,
      getDomain,
      applyBlur,
      removeAllCustomBlur,
      loadAndApply,
      saveHiddenField,
      injectStyles,
      _getCachedFields: () => cachedFields,
      _setCachedFields: (f) => {
        cachedFields = f;
      },
      _setLastRightClicked: (el) => {
        lastRightClickedElement = el;
      },
      _stopObserver: () => {
        observer.disconnect();
        clearTimeout(debounceTimer);
        clearRetryTimers();
      },
    };
  }
})();
