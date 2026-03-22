const { createChromeMock } = require("./helpers/chrome-mock");

describe("content.js", () => {
  let contentModule;
  let chromeMock;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = "";
    delete window.__azureBlurInjected;
    chromeMock = createChromeMock();
    global.chrome = chromeMock;
    contentModule = require("../content");
  });

  afterEach(() => {
    if (contentModule && typeof contentModule.stop === "function") {
      try {
        contentModule.stop();
      } catch (_) {}
    }
    contentModule = null;
    document.body.innerHTML = "";
    delete global.chrome;
    delete window.__azureBlurInjected;
  });

  // ── Unit tests: containsSubscriptionId ──────────────────────────────

  describe("containsSubscriptionId", () => {
    test("returns true for valid lowercase GUID", () => {
      expect(
        contentModule.containsSubscriptionId(
          "12345678-1234-1234-1234-123456789abc"
        )
      ).toBe(true);
    });

    test("returns true for valid uppercase GUID", () => {
      expect(
        contentModule.containsSubscriptionId(
          "12345678-1234-1234-1234-123456789ABC"
        )
      ).toBe(true);
    });

    test("returns true for mixed case GUID", () => {
      expect(
        contentModule.containsSubscriptionId(
          "12345678-AbCd-1234-aBcD-123456789AbC"
        )
      ).toBe(true);
    });

    test("returns true when GUID is embedded in surrounding text", () => {
      expect(
        contentModule.containsSubscriptionId(
          "Subscription: 12345678-1234-1234-1234-123456789abc (MySubscription)"
        )
      ).toBe(true);
    });

    test("returns false for empty string", () => {
      expect(contentModule.containsSubscriptionId("")).toBe(false);
    });

    test("returns false for non-GUID text", () => {
      expect(contentModule.containsSubscriptionId("hello world")).toBe(false);
    });

    test("returns false for partial GUID", () => {
      expect(
        contentModule.containsSubscriptionId("12345678-1234-1234")
      ).toBe(false);
    });

    test("returns false for GUID with non-hex characters", () => {
      expect(
        contentModule.containsSubscriptionId(
          "12345678-1234-1234-1234-12345678zzzz"
        )
      ).toBe(false);
    });

    test("returns false for GUID with wrong section lengths", () => {
      expect(
        contentModule.containsSubscriptionId(
          "1234567-1234-1234-1234-123456789abc"
        )
      ).toBe(false);
    });
  });

  // ── Unit test: BLUR_CLASS constant ──────────────────────────────────

  describe("BLUR_CLASS", () => {
    test('equals "azure-blur-hidden"', () => {
      expect(contentModule.BLUR_CLASS).toBe("azure-blur-hidden");
    });
  });

  // ── Integration tests: processNode ──────────────────────────────────

  describe("processNode", () => {
    test("does nothing when disabled", () => {
      contentModule._setEnabled(false);
      document.body.innerHTML =
        "<div>12345678-1234-1234-1234-123456789abc</div>";
      contentModule.processNode(document.body);
      expect(document.querySelector(".azure-blur-hidden")).toBeNull();
    });

    test("does nothing when root is null", () => {
      expect(() => contentModule.processNode(null)).not.toThrow();
    });

    test("does nothing when root has no querySelectorAll", () => {
      expect(() =>
        contentModule.processNode(document.createTextNode("text"))
      ).not.toThrow();
    });

    // Strategy 1: TreeWalker — GUID in own direct text
    test("blurs element with GUID in own text content", () => {
      document.body.innerHTML =
        "<div><span>12345678-1234-1234-1234-123456789abc</span></div>";
      contentModule.processNode(document.body);
      const span = document.querySelector("span");
      expect(span.classList.contains("azure-blur-hidden")).toBe(true);
    });

    test("does not blur parent when GUID is only in child element text", () => {
      document.body.innerHTML =
        '<div id="parent"><span>12345678-1234-1234-1234-123456789abc</span></div>';
      contentModule.processNode(document.body);
      const parent = document.getElementById("parent");
      expect(parent.classList.contains("azure-blur-hidden")).toBe(false);
    });

    // Strategy 2: aria-label + essentialsValue class
    test('blurs element with aria-label "Subscription" and essentialsValue class', () => {
      document.body.innerHTML =
        '<div aria-label="Subscription ID" class="fxt-essentialsValue">val</div>';
      contentModule.processNode(document.body);
      const el = document.querySelector("[aria-label]");
      expect(el.classList.contains("azure-blur-hidden")).toBe(true);
    });

    test("does not blur subscription aria-label without essentialsValue class", () => {
      document.body.innerHTML =
        '<div aria-label="Subscription ID" class="other-class">val</div>';
      contentModule.processNode(document.body);
      const el = document.querySelector("[aria-label]");
      expect(el.classList.contains("azure-blur-hidden")).toBe(false);
    });

    // Strategy 3: essentialsLabel text "Subscription" → blur sibling essentialsValue
    test("blurs sibling value when label has Subscription text", () => {
      document.body.innerHTML = [
        "<div>",
        '  <span class="essentialsLabel">Subscription</span>',
        '  <span class="essentialsValue">My Sub Name</span>',
        "</div>",
      ].join("");
      contentModule.processNode(document.body);
      const value = document.querySelector(".essentialsValue");
      expect(value.classList.contains("azure-blur-hidden")).toBe(true);
    });

    test("does not blur sibling when label text is not Subscription", () => {
      document.body.innerHTML = [
        "<div>",
        '  <span class="essentialsLabel">Resource group</span>',
        '  <span class="essentialsValue">my-rg</span>',
        "</div>",
      ].join("");
      contentModule.processNode(document.body);
      const value = document.querySelector(".essentialsValue");
      expect(value.classList.contains("azure-blur-hidden")).toBe(false);
    });

    // Strategy 4: billing subscription asset attribute
    test("blurs element with billing subscription asset attribute", () => {
      document.body.innerHTML =
        '<div data-asset-id="asset/Microsoft_Azure_Billing/Subscription/12345">Sub</div>';
      contentModule.processNode(document.body);
      const el = document.querySelector("[data-asset-id]");
      expect(el.classList.contains("azure-blur-hidden")).toBe(true);
    });

    // Strategy 5: selector-matched elements with GUID in textContent
    test("blurs element matching data-bind subscription selector with GUID", () => {
      document.body.innerHTML =
        '<div data-bind="subscription-id">12345678-1234-1234-1234-123456789abc</div>';
      contentModule.processNode(document.body);
      const el = document.querySelector("[data-bind]");
      expect(el.classList.contains("azure-blur-hidden")).toBe(true);
    });

    test("blurs selector-matched parent when GUID is in child element", () => {
      document.body.innerHTML = [
        '<div data-bind="subscription-id">',
        "  <span>12345678-1234-1234-1234-123456789abc</span>",
        "</div>",
      ].join("");
      contentModule.processNode(document.body);
      const div = document.querySelector("[data-bind]");
      expect(div.classList.contains("azure-blur-hidden")).toBe(true);
    });

    test("does not blur selector-matched element without GUID text", () => {
      document.body.innerHTML =
        '<div data-bind="subscription-id">No GUID here</div>';
      contentModule.processNode(document.body);
      const el = document.querySelector("[data-bind]");
      expect(el.classList.contains("azure-blur-hidden")).toBe(false);
    });
  });

  // ── Integration tests: removeBlur ───────────────────────────────────

  describe("removeBlur", () => {
    test("removes blur class from all blurred elements", () => {
      document.body.innerHTML = [
        '<div class="azure-blur-hidden">blurred 1</div>',
        '<span class="azure-blur-hidden">blurred 2</span>',
      ].join("");
      contentModule.removeBlur();
      expect(document.querySelectorAll(".azure-blur-hidden").length).toBe(0);
    });

    test("does nothing when no elements are blurred", () => {
      document.body.innerHTML = "<div>not blurred</div>";
      expect(() => contentModule.removeBlur()).not.toThrow();
    });
  });

  // ── Integration tests: start / stop lifecycle ───────────────────────

  describe("start and stop", () => {
    test("start blurs matching elements in document body", () => {
      document.body.innerHTML =
        "<div>12345678-1234-1234-1234-123456789abc</div>";
      contentModule._setEnabled(true);
      contentModule.start();
      expect(document.querySelector(".azure-blur-hidden")).not.toBeNull();
    });

    test("stop removes all blur effects", () => {
      document.body.innerHTML =
        '<div class="azure-blur-hidden">blurred</div>';
      contentModule.stop();
      expect(document.querySelector(".azure-blur-hidden")).toBeNull();
    });

    test("stop prevents observer from processing new nodes", async () => {
      contentModule.stop();
      const el = document.createElement("div");
      el.textContent = "12345678-1234-1234-1234-123456789abc";
      document.body.appendChild(el);
      await new Promise((r) => setTimeout(r, 0));
      expect(el.classList.contains("azure-blur-hidden")).toBe(false);
    });
  });

  // ── chrome.storage integration ──────────────────────────────────────

  describe("chrome.storage integration", () => {
    test("reads enabled state from storage on init", () => {
      expect(chromeMock.storage.local.get).toHaveBeenCalledWith(
        { enabled: true },
        expect.any(Function)
      );
    });

    test("registers a storage change listener", () => {
      expect(chromeMock.storage.onChanged.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test("disables blurring when storage changes to disabled", () => {
      document.body.innerHTML =
        "<div>12345678-1234-1234-1234-123456789abc</div>";
      contentModule.start();
      expect(document.querySelector(".azure-blur-hidden")).not.toBeNull();

      chromeMock.storage.local.set({ enabled: false });
      expect(contentModule._getEnabled()).toBe(false);
      expect(document.querySelector(".azure-blur-hidden")).toBeNull();
    });

    test("re-enables blurring when storage changes to enabled", () => {
      contentModule._setEnabled(false);
      document.body.innerHTML =
        "<div>12345678-1234-1234-1234-123456789abc</div>";

      chromeMock.storage.local.set({ enabled: true });
      expect(contentModule._getEnabled()).toBe(true);
      expect(document.querySelector(".azure-blur-hidden")).not.toBeNull();
    });
  });

  // ── Duplicate injection prevention ──────────────────────────────────

  describe("duplicate injection prevention", () => {
    test("does not re-inject when __azureBlurInjected is already set", () => {
      jest.resetModules();
      window.__azureBlurInjected = true;
      const freshMock = createChromeMock();
      global.chrome = freshMock;

      const module2 = require("../content");

      expect(module2).toEqual({});
      expect(freshMock.storage.local.get).not.toHaveBeenCalled();
    });
  });

  // ── MutationObserver ────────────────────────────────────────────────

  describe("MutationObserver", () => {
    test("processes dynamically added elements with GUIDs", async () => {
      contentModule._setEnabled(true);
      contentModule.start();

      // processNode uses TreeWalker on descendants, so the GUID must
      // be in a child element of the appended container.
      const container = document.createElement("div");
      const span = document.createElement("span");
      span.textContent = "12345678-1234-1234-1234-123456789abc";
      container.appendChild(span);
      document.body.appendChild(container);

      await new Promise((r) => setTimeout(r, 50));
      expect(span.classList.contains("azure-blur-hidden")).toBe(true);
    });

    test("ignores dynamically added text nodes", async () => {
      contentModule._setEnabled(true);
      contentModule.start();

      const textNode = document.createTextNode(
        "12345678-1234-1234-1234-123456789abc"
      );
      document.body.appendChild(textNode);

      await new Promise((r) => setTimeout(r, 0));
      expect(document.querySelector(".azure-blur-hidden")).toBeNull();
    });
  });
});
