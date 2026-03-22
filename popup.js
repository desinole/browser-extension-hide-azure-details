function initPopup() {
  loadHiddenFields();
}

// ── Hidden-fields management ────────────────────────────────────────

function loadHiddenFields() {
  const list = document.getElementById("hidden-fields-list");
  const domainLabel = document.getElementById("domain-label");
  const clearBtn = document.getElementById("clear-all-btn");
  const emptyMsg = document.getElementById("empty-message");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].url) {
      if (domainLabel) domainLabel.textContent = "";
      if (emptyMsg) emptyMsg.style.display = "block";
      if (clearBtn) clearBtn.style.display = "none";
      if (list) list.innerHTML = "";
      return;
    }

    let domain;
    try {
      domain = new URL(tabs[0].url).hostname;
    } catch (_) {
      return;
    }

    if (domainLabel) domainLabel.textContent = `(${domain})`;

    chrome.storage.local.get({ customHiddenFields: {} }, (data) => {
      const fields = data.customHiddenFields[domain] || [];
      renderFieldList(fields, domain, list, emptyMsg, clearBtn);
    });
  });
}

function renderFieldList(fields, domain, list, emptyMsg, clearBtn) {
  if (!list) return;
  list.innerHTML = "";

  if (fields.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";
  if (clearBtn) {
    clearBtn.style.display = "block";
    clearBtn.onclick = () => clearAllFields(domain);
  }

  fields.forEach((field, index) => {
    const item = document.createElement("div");
    item.className = "field-item";

    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = field.label;
    label.title = field.selector;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "\u00d7";
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", () => removeField(domain, index));

    item.appendChild(label);
    item.appendChild(removeBtn);
    list.appendChild(item);
  });
}

function removeField(domain, index) {
  chrome.storage.local.get({ customHiddenFields: {} }, (data) => {
    const fields = data.customHiddenFields;
    if (fields[domain]) {
      fields[domain].splice(index, 1);
      if (fields[domain].length === 0) delete fields[domain];
      chrome.storage.local.set({ customHiddenFields: fields }, () => {
        loadHiddenFields();
      });
    }
  });
}

function clearAllFields(domain) {
  chrome.storage.local.get({ customHiddenFields: {} }, (data) => {
    const fields = data.customHiddenFields;
    delete fields[domain];
    chrome.storage.local.set({ customHiddenFields: fields }, () => {
      loadHiddenFields();
    });
  });
}

// Auto-initialize in browser
if (typeof module === "undefined") {
  initPopup();
}

// Export for testing (Node.js / Jest)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initPopup,
    loadHiddenFields,
    renderFieldList,
    removeField,
    clearAllFields,
  };
}
