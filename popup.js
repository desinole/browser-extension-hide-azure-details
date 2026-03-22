function initPopup() {
  const toggle = document.getElementById("toggle");

  chrome.storage.local.get({ enabled: true }, (data) => {
    toggle.checked = data.enabled;
  });

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

  return toggle;
}

// Auto-initialize in browser
if (typeof module === "undefined") {
  initPopup();
}

// Export for testing (Node.js / Jest)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { initPopup };
}
