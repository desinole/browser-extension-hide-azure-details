// Register context menu on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "hide-field",
    title: "Hide this field",
    contexts: ["all"],
  });
});

// Handle context menu clicks — forward to the content script in the right frame
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "hide-field" && tab?.id) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "hideClickedElement" },
      { frameId: info.frameId ?? 0 }
    );
  }
});
