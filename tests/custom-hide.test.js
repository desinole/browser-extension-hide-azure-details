const { createChromeMock } = require("./helpers/chrome-mock");

describe("custom-hide.js", () => {
  let customHide;
  let chromeMock;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    chromeMock = createChromeMock();
    global.chrome = chromeMock;

    // Load selector-generator into global scope (mimics content script loading)
    const sg = require("../selector-generator");
    global.generateSelector = sg.generateSelector;
    global.generateLabel = sg.generateLabel;
    global.getOwnText = sg.getOwnText;

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { hostname: "portal.azure.com" },
      writable: true,
      configurable: true,
    });

    customHide = require("../custom-hide");
  });

  afterEach(() => {
    if (customHide && customHide._stopObserver) {
      try {
        customHide._stopObserver();
      } catch (_) {}
    }
    customHide = null;
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    delete global.chrome;
    delete global.generateSelector;
    delete global.generateLabel;
    delete global.getOwnText;
  });

  // ── Style injection ───────────────────────────────────────────────

  describe("injectStyles", () => {
    test("injects a style element with the custom blur class", () => {
      customHide.injectStyles();
      const style = document.getElementById("custom-blur-styles");
      expect(style).not.toBeNull();
      expect(style.textContent).toContain("custom-blur-hidden");
    });

    test("does not duplicate the style element", () => {
      customHide.injectStyles();
      customHide.injectStyles();
      expect(document.querySelectorAll("#custom-blur-styles").length).toBe(1);
    });
  });

  // ── applyBlur ─────────────────────────────────────────────────────

  describe("applyBlur", () => {
    test("applies blur to elements matching cached selectors", () => {
      document.body.innerHTML = '<div class="secret">sensitive</div>';
      customHide._setCachedFields([
        { selector: "div.secret", label: "div" },
      ]);
      customHide.applyBlur();
      expect(
        document.querySelector(".secret").classList.contains("custom-blur-hidden")
      ).toBe(true);
    });

    test("does nothing when cached fields are empty", () => {
      document.body.innerHTML = "<div>safe</div>";
      customHide._setCachedFields([]);
      customHide.applyBlur();
      expect(document.querySelector(".custom-blur-hidden")).toBeNull();
    });

    test("handles invalid selectors without throwing", () => {
      customHide._setCachedFields([{ selector: "[[[bad", label: "bad" }]);
      expect(() => customHide.applyBlur()).not.toThrow();
    });

    test("falls back to text matching when selector fails", () => {
      document.body.innerHTML = '<span class="value">my-sub-id</span>';
      customHide._setCachedFields([
        {
          selector: "div.nonexistent > span.gone",
          label: "span",
          tag: "span",
          textContent: "my-sub-id",
        },
      ]);
      customHide.applyBlur();
      expect(
        document.querySelector(".value").classList.contains("custom-blur-hidden")
      ).toBe(true);
    });

    test("does not fall back when selector matches", () => {
      document.body.innerHTML = [
        '<span class="target">text</span>',
        '<span class="other">text</span>',
      ].join("");
      customHide._setCachedFields([
        {
          selector: "span.target",
          label: "span",
          tag: "span",
          textContent: "text",
        },
      ]);
      customHide.applyBlur();
      expect(
        document.querySelector(".target").classList.contains("custom-blur-hidden")
      ).toBe(true);
      expect(
        document.querySelector(".other").classList.contains("custom-blur-hidden")
      ).toBe(false);
    });
  });

  // ── removeAllCustomBlur ───────────────────────────────────────────

  describe("removeAllCustomBlur", () => {
    test("removes custom blur class from all elements", () => {
      document.body.innerHTML = [
        '<div class="custom-blur-hidden">a</div>',
        '<span class="custom-blur-hidden">b</span>',
      ].join("");
      customHide.removeAllCustomBlur();
      expect(document.querySelectorAll(".custom-blur-hidden").length).toBe(0);
    });
  });

  // ── saveHiddenField ───────────────────────────────────────────────

  describe("saveHiddenField", () => {
    test("stores a new field with tag and text content", () => {
      document.body.innerHTML = '<div class="test">secret value</div>';
      const el = document.querySelector(".test");
      customHide.saveHiddenField("div.test", "div.test", el);
      const call = chromeMock.storage.local.set.mock.calls.find(
        (c) => c[0].customHiddenFields
      );
      const entry = call[0].customHiddenFields["portal.azure.com"][0];
      expect(entry.selector).toBe("div.test");
      expect(entry.tag).toBe("div");
      expect(entry.textContent).toBe("secret value");
    });

    test("does not create duplicate entries", () => {
      const el = document.createElement("div");
      customHide.saveHiddenField("div.dup", "div.dup", el);
      customHide.saveHiddenField("div.dup", "div.dup", el);
      const calls = chromeMock.storage.local.set.mock.calls.filter(
        (c) => c[0].customHiddenFields
      );
      const last = calls[calls.length - 1][0];
      const dupes = last.customHiddenFields["portal.azure.com"].filter(
        (f) => f.selector === "div.dup"
      );
      expect(dupes.length).toBe(1);
    });
  });

  // ── getDomain ─────────────────────────────────────────────────────

  describe("getDomain", () => {
    test("returns the current hostname", () => {
      expect(customHide.getDomain()).toBe("portal.azure.com");
    });
  });

  // ── storage.onChanged listener ────────────────────────────────────

  describe("storage change listener", () => {
    test("re-applies blur from updated storage", () => {
      document.body.innerHTML = '<div class="target">data</div>';

      // Trigger storage change
      chromeMock.storage.local.set({
        customHiddenFields: {
          "portal.azure.com": [{ selector: "div.target", label: "t" }],
        },
      });

      expect(
        document
          .querySelector(".target")
          .classList.contains("custom-blur-hidden")
      ).toBe(true);
    });

    test("removes old blur before re-applying", () => {
      document.body.innerHTML = [
        '<div class="old custom-blur-hidden">old</div>',
        '<div class="new-field">new</div>',
      ].join("");

      chromeMock.storage.local.set({
        customHiddenFields: {
          "portal.azure.com": [{ selector: "div.new-field", label: "n" }],
        },
      });

      expect(
        document.querySelector(".old").classList.contains("custom-blur-hidden")
      ).toBe(false);
      expect(
        document
          .querySelector(".new-field")
          .classList.contains("custom-blur-hidden")
      ).toBe(true);
    });
  });
});
