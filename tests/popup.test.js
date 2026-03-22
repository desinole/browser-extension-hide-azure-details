const { createChromeMock } = require("./helpers/chrome-mock");

describe("popup.js", () => {
  let chromeMock;

  // ── Hidden-fields management ────────────────────────────────────

  describe("hidden fields management", () => {
    function setupFullDOM() {
      document.body.innerHTML = [
        '<div id="hidden-fields-section">',
        '  <span id="domain-label"></span>',
        '  <div id="hidden-fields-list"></div>',
        '  <p id="empty-message"></p>',
        '  <button id="clear-all-btn" style="display:none"></button>',
        "</div>",
      ].join("");
    }

    beforeEach(() => {
      jest.resetModules();
      setupFullDOM();
      chromeMock = createChromeMock();
      chromeMock._setTabs([
        { url: "https://portal.azure.com/resource/vm1" },
      ]);
      global.chrome = chromeMock;
    });

    afterEach(() => {
      document.body.innerHTML = "";
      delete global.chrome;
    });

    test("displays the domain name", () => {
      const { initPopup } = require("../popup");
      initPopup();
      expect(
        document.getElementById("domain-label").textContent
      ).toContain("portal.azure.com");
    });

    test("shows empty message when no fields are hidden", () => {
      const { initPopup } = require("../popup");
      initPopup();
      const msg = document.getElementById("empty-message");
      expect(msg.style.display).not.toBe("none");
    });

    test("renders the list of hidden fields", () => {
      chromeMock._store.customHiddenFields = {
        "portal.azure.com": [
          { selector: "div.a", label: 'div "Resource group"' },
          { selector: "span#b", label: 'span#b "12345"' },
        ],
      };
      const { initPopup } = require("../popup");
      initPopup();
      expect(document.querySelectorAll(".field-item").length).toBe(2);
    });

    test("hides empty message when fields exist", () => {
      chromeMock._store.customHiddenFields = {
        "portal.azure.com": [{ selector: "div.a", label: "div" }],
      };
      const { initPopup } = require("../popup");
      initPopup();
      expect(document.getElementById("empty-message").style.display).toBe(
        "none"
      );
    });

    test("shows Clear All button when fields exist", () => {
      chromeMock._store.customHiddenFields = {
        "portal.azure.com": [{ selector: "div.a", label: "div" }],
      };
      const { initPopup } = require("../popup");
      initPopup();
      expect(document.getElementById("clear-all-btn").style.display).toBe(
        "block"
      );
    });

    test("removes a field when remove button is clicked", () => {
      chromeMock._store.customHiddenFields = {
        "portal.azure.com": [
          { selector: "div.a", label: "A" },
          { selector: "div.b", label: "B" },
        ],
      };
      const { initPopup } = require("../popup");
      initPopup();

      document.querySelector(".remove-btn").click();

      const setCall = chromeMock.storage.local.set.mock.calls.find(
        (c) => c[0].customHiddenFields
      );
      expect(setCall).toBeTruthy();
      const remaining =
        setCall[0].customHiddenFields["portal.azure.com"];
      expect(remaining.length).toBe(1);
      expect(remaining[0].selector).toBe("div.b");
    });

    test("clears all fields when Clear All is clicked", () => {
      chromeMock._store.customHiddenFields = {
        "portal.azure.com": [
          { selector: "div.a", label: "A" },
          { selector: "div.b", label: "B" },
        ],
      };
      const { initPopup } = require("../popup");
      initPopup();

      document.getElementById("clear-all-btn").click();

      const setCall = chromeMock.storage.local.set.mock.calls.find(
        (c) =>
          c[0].customHiddenFields &&
          !c[0].customHiddenFields["portal.azure.com"]
      );
      expect(setCall).toBeTruthy();
    });

    test("handles missing tab URL gracefully", () => {
      chromeMock._setTabs([]);
      const { initPopup } = require("../popup");
      expect(() => initPopup()).not.toThrow();
    });
  });
});
