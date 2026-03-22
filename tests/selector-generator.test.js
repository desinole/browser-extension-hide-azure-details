describe("selector-generator.js", () => {
  let mod;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = "";
    mod = require("../selector-generator");
  });

  // ── isStableClass ─────────────────────────────────────────────────

  describe("isStableClass", () => {
    test("accepts normal class names", () => {
      expect(mod.isStableClass("field-value")).toBe(true);
      expect(mod.isStableClass("container")).toBe(true);
      expect(mod.isStableClass("btn-primary")).toBe(true);
    });

    test("rejects CSS-in-JS prefixed classes", () => {
      expect(mod.isStableClass("css-1a2b3c")).toBe(false);
      expect(mod.isStableClass("sc-bZQynM")).toBe(false);
      expect(mod.isStableClass("emotion-abc")).toBe(false);
    });

    test("rejects Angular-generated classes", () => {
      expect(mod.isStableClass("_ngcontent-abc-123")).toBe(false);
      expect(mod.isStableClass("_nghost-xyz")).toBe(false);
    });

    test("rejects hex-hash classes", () => {
      expect(mod.isStableClass("a3f2b1c9")).toBe(false);
      expect(mod.isStableClass("deadbeef")).toBe(false);
    });

    test("rejects underscore-prefixed hash classes", () => {
      expect(mod.isStableClass("_aBcD1234")).toBe(false);
    });
  });

  // ── generateSelector ──────────────────────────────────────────────

  describe("generateSelector", () => {
    test('returns "body" for document.body', () => {
      expect(mod.generateSelector(document.body)).toBe("body");
    });

    test('returns "body" for null', () => {
      expect(mod.generateSelector(null)).toBe("body");
    });

    test('returns "body" for document.documentElement', () => {
      expect(mod.generateSelector(document.documentElement)).toBe("body");
    });

    test("returns id selector for element with id", () => {
      document.body.innerHTML = '<div id="my-field">text</div>';
      const el = document.getElementById("my-field");
      expect(mod.generateSelector(el)).toBe("#my-field");
    });

    test("includes stable class in the selector", () => {
      document.body.innerHTML = '<div class="field-value">text</div>';
      const el = document.querySelector(".field-value");
      const sel = mod.generateSelector(el);
      expect(sel).toContain("div.field-value");
      expect(document.querySelector(sel)).toBe(el);
    });

    test("skips dynamic-looking classes", () => {
      document.body.innerHTML =
        '<div class="css-1a2b3c field-value sc-bZQynM">text</div>';
      const el = document.querySelector("div");
      const sel = mod.generateSelector(el);
      expect(sel).toContain("field-value");
      expect(sel).not.toContain("css-1a2b3c");
      expect(sel).not.toContain("sc-bZQynM");
    });

    test("prefers data-testid for identification", () => {
      document.body.innerHTML =
        '<div><span data-testid="sub-name">text</span></div>';
      const el = document.querySelector("span");
      const sel = mod.generateSelector(el);
      expect(sel).toContain('data-testid="sub-name"');
      expect(document.querySelector(sel)).toBe(el);
    });

    test("prefers aria-label for identification", () => {
      document.body.innerHTML =
        '<div><span aria-label="Subscription ID">text</span></div>';
      const el = document.querySelector("span");
      const sel = mod.generateSelector(el);
      expect(sel).toContain("aria-label");
      expect(document.querySelector(sel)).toBe(el);
    });

    test("uses nth-of-type for ambiguous siblings", () => {
      document.body.innerHTML =
        "<ul><li>first</li><li>second</li><li>third</li></ul>";
      const second = document.querySelectorAll("li")[1];
      const sel = mod.generateSelector(second);
      expect(sel).toContain("nth-of-type(2)");
      expect(document.querySelector(sel)).toBe(second);
    });

    test("generated selector uniquely identifies the element", () => {
      document.body.innerHTML = [
        '<div class="container">',
        '  <span class="label">Name</span>',
        '  <span class="value">John</span>',
        "</div>",
        '<div class="container">',
        '  <span class="label">Age</span>',
        '  <span class="value">30</span>',
        "</div>",
      ].join("");
      const target = document.querySelectorAll(".value")[1];
      const sel = mod.generateSelector(target);
      expect(document.querySelector(sel)).toBe(target);
    });

    test("stops at ancestor with id", () => {
      document.body.innerHTML = [
        '<div id="root">',
        '  <div class="inner"><span>text</span></div>',
        "</div>",
      ].join("");
      const span = document.querySelector("span");
      const sel = mod.generateSelector(span);
      expect(sel).toMatch(/^#root/);
      expect(document.querySelector(sel)).toBe(span);
    });

    test("limits to 3 classes per segment", () => {
      document.body.innerHTML =
        '<div class="alpha bravo charlie delta echo">text</div>';
      const el = document.querySelector("div");
      const sel = mod.generateSelector(el);
      const classCount = (sel.match(/\./g) || []).length;
      expect(classCount).toBeLessThanOrEqual(3);
    });

    test("produces shortest unique selector when possible", () => {
      document.body.innerHTML = [
        "<main>",
        '  <section><div class="unique-target">text</div></section>',
        "</main>",
      ].join("");
      const el = document.querySelector(".unique-target");
      const sel = mod.generateSelector(el);
      // Selector should uniquely match the element
      expect(document.querySelectorAll(sel).length).toBe(1);
      expect(document.querySelector(sel)).toBe(el);
    });

    test("includes parent context when class alone is ambiguous", () => {
      document.body.innerHTML = [
        '<div class="item"><span class="val">a</span></div>',
        '<div class="item"><span class="val">b</span></div>',
      ].join("");
      const second = document.querySelectorAll(".val")[1];
      const sel = mod.generateSelector(second);
      expect(document.querySelector(sel)).toBe(second);
    });
  });

  // ── generateLabel ─────────────────────────────────────────────────

  describe("generateLabel", () => {
    test("includes tag name", () => {
      document.body.innerHTML = "<span>hello</span>";
      const el = document.querySelector("span");
      expect(mod.generateLabel(el)).toMatch(/^span/);
    });

    test("includes id when present", () => {
      document.body.innerHTML = '<div id="my-id">text</div>';
      const el = document.getElementById("my-id");
      expect(mod.generateLabel(el)).toContain("#my-id");
    });

    test("includes text content in quotes", () => {
      document.body.innerHTML = "<span>Short text</span>";
      const el = document.querySelector("span");
      expect(mod.generateLabel(el)).toContain('"Short text"');
    });

    test("truncates long text with ellipsis indicator", () => {
      const longText = "A".repeat(50);
      document.body.innerHTML = `<span>${longText}</span>`;
      const el = document.querySelector("span");
      const label = mod.generateLabel(el);
      expect(label).toContain("\u2026");
      expect(label.length).toBeLessThan(60);
    });

    test("handles element with no text", () => {
      document.body.innerHTML = "<div></div>";
      const el = document.querySelector("div");
      expect(mod.generateLabel(el)).toBe("div");
    });
  });

  // ── getOwnText ──────────────────────────────────────────────────

  describe("getOwnText", () => {
    test("extracts direct text only, excluding child elements", () => {
      document.body.innerHTML =
        '<div>direct text <span>child text</span> more</div>';
      const el = document.querySelector("div");
      expect(mod.getOwnText(el)).toBe("direct text  more");
    });

    test("returns empty string for element with no text", () => {
      document.body.innerHTML = '<div><span>child only</span></div>';
      const el = document.querySelector("div");
      expect(mod.getOwnText(el)).toBe("");
    });
  });
});
