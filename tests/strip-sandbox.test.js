describe("strip-sandbox.js", () => {
  let origSetAttribute;
  let origSandboxDesc;
  let moduleResult;

  beforeEach(() => {
    jest.resetModules();
    origSetAttribute = Element.prototype.setAttribute;
    origSandboxDesc = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "sandbox"
    );
  });

  afterEach(() => {
    // Disconnect observer from the loaded module
    if (moduleResult && moduleResult.observer) {
      moduleResult.observer.disconnect();
      moduleResult = null;
    }
    // Restore original prototypes
    Element.prototype.setAttribute = origSetAttribute;
    if (origSandboxDesc) {
      Object.defineProperty(
        HTMLIFrameElement.prototype,
        "sandbox",
        origSandboxDesc
      );
    }
    document.body.innerHTML = "";
  });

  function loadModule() {
    const { initSandboxStripping } = require("../strip-sandbox");
    moduleResult = initSandboxStripping();
    return moduleResult;
  }

  // ── setAttribute interception ─────────────────────────────────────

  describe("setAttribute interception", () => {
    test("prevents sandbox attribute on iframes", () => {
      loadModule();
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts");
      expect(iframe.hasAttribute("sandbox")).toBe(false);
    });

    test("allows other attributes on iframes", () => {
      loadModule();
      const iframe = document.createElement("iframe");
      iframe.setAttribute("src", "https://example.com");
      expect(iframe.getAttribute("src")).toBe("https://example.com");
    });

    test("allows sandbox attribute on non-iframe elements", () => {
      loadModule();
      const div = document.createElement("div");
      div.setAttribute("sandbox", "test-value");
      expect(div.getAttribute("sandbox")).toBe("test-value");
    });

    test("is case-insensitive for the sandbox attribute name", () => {
      loadModule();
      const iframe = document.createElement("iframe");
      iframe.setAttribute("SANDBOX", "allow-scripts");
      expect(iframe.hasAttribute("SANDBOX")).toBe(false);
    });
  });

  // ── sandbox property override ─────────────────────────────────────

  describe("sandbox property override", () => {
    test("sandbox setter is a no-op for iframes", () => {
      loadModule();
      const iframe = document.createElement("iframe");
      expect(() => {
        iframe.sandbox = "allow-scripts";
      }).not.toThrow();
    });
  });

  // ── MutationObserver fallback ─────────────────────────────────────

  describe("MutationObserver fallback", () => {
    test("removes sandbox from dynamically added iframes", async () => {
      loadModule();
      const iframe = document.createElement("iframe");
      // Use the saved original setAttribute to bypass the interception
      origSetAttribute.call(iframe, "sandbox", "allow-scripts");
      document.body.appendChild(iframe);

      await new Promise((r) => setTimeout(r, 0));
      expect(iframe.hasAttribute("sandbox")).toBe(false);
    });

    test("removes sandbox from nested iframes in added elements", async () => {
      loadModule();
      const container = document.createElement("div");
      const iframe = document.createElement("iframe");
      origSetAttribute.call(iframe, "sandbox", "allow-scripts");
      container.appendChild(iframe);
      document.body.appendChild(container);

      await new Promise((r) => setTimeout(r, 0));
      expect(iframe.hasAttribute("sandbox")).toBe(false);
    });

    test("ignores non-element nodes without errors", async () => {
      loadModule();
      const textNode = document.createTextNode("hello");
      expect(() => document.body.appendChild(textNode)).not.toThrow();
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
