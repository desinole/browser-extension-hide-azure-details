(() => {
  "use strict";

  // Regex for Azure subscription IDs (GUID format)
  const SUBSCRIPTION_ID_REGEX =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  // Selectors commonly used in Azure portal for subscription info
  const AZURE_SELECTORS = [
    '[data-bind*="subscription"]',
    '[aria-label*="Subscription"]',
    '[aria-label*="subscription"]',
    '[title*="subscription" i]',
    'span[class*="fxs-blade-title"]',
    '.fxs-journey-breadcrumb',
    '.msportalfx-breadcrumb',
    '.fxc-essentials-label-container',
    '.fxc-essentials-value-wrapper',
    '.azc-formElementContainer',
  ];

  const BLUR_CLASS = "azure-blur-hidden";
  let enabled = true;

  function containsSubscriptionId(text) {
    return SUBSCRIPTION_ID_REGEX.test(text);
  }

  function isSubscriptionLabel(text) {
    const lower = text.toLowerCase().trim();
    return lower === "subscription" || lower === "subscription id" || lower === "subscription name";
  }

  function blurAdjacentValue(labelEl) {
    const parent = labelEl.closest(
      ".fxc-essentials-item, .azc-formElementContainer, tr, [class*='property-row'], [class*='row']"
    );
    if (parent) {
      parent.querySelectorAll("span, a, div, td").forEach((el) => {
        if (el !== labelEl && el.textContent.trim().length > 0) {
          el.classList.add(BLUR_CLASS);
        }
      });
    }
  }

  function processNode(root) {
    if (!enabled) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent || "";

      // Blur elements whose visible text contains a subscription GUID
      if (node.children.length === 0 && containsSubscriptionId(text)) {
        node.classList.add(BLUR_CLASS);
      }

      // Blur values next to "Subscription" labels
      if (node.children.length === 0 && isSubscriptionLabel(text)) {
        blurAdjacentValue(node);
      }
    }

    // Also scan selector-matched elements
    AZURE_SELECTORS.forEach((sel) => {
      try {
        root.querySelectorAll?.(sel)?.forEach((el) => {
          const t = el.textContent || "";
          if (containsSubscriptionId(t)) {
            el.classList.add(BLUR_CLASS);
          }
        });
      } catch (_) {}
    });

    // Blur any element with attributes referencing the billing subscription asset
    try {
      root.querySelectorAll("*").forEach((el) => {
        for (const attr of el.attributes) {
          if (attr.value.includes("asset/Microsoft_Azure_Billing/Subscription")) {
            el.classList.add(BLUR_CLASS);
            break;
          }
        }
      });
    } catch (_) {}
  }

  function removeBlur() {
    document.querySelectorAll(`.${BLUR_CLASS}`).forEach((el) => {
      el.classList.remove(BLUR_CLASS);
    });
  }

  // Observe DOM changes (Azure portal is a SPA)
  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const m of mutations) {
      for (const added of m.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE) {
          processNode(added);
        }
      }
    }
  });

  function start() {
    processNode(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stop() {
    observer.disconnect();
    removeBlur();
  }

  // Listen for toggle messages from popup
  chrome.storage.local.get({ enabled: true }, (data) => {
    enabled = data.enabled;
    if (enabled) start();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabled = changes.enabled.newValue;
      if (enabled) {
        start();
      } else {
        stop();
      }
    }
  });
})();
