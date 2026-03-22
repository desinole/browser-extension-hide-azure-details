/* eslint-disable no-unused-vars */
// Loaded as a content script before custom-hide.js (shared execution context).

const cssEscape =
  typeof CSS !== "undefined" && CSS.escape
    ? (s) => CSS.escape(s)
    : (s) => s.replace(/([^\w-])/g, "\\$1");

// Classes that look auto-generated (CSS modules, styled-components, Emotion, Angular)
const DYNAMIC_CLASS_RE =
  /^(css|sc|emotion)-|^_[a-zA-Z0-9]{4,}$|^[a-zA-Z]{1,3}[A-Z][a-zA-Z0-9]{4,}$|_ngcontent|_nghost|__/;

/**
 * Return true if a class name looks stable (not auto-generated).
 */
function isStableClass(cls) {
  if (DYNAMIC_CLASS_RE.test(cls)) return false;
  if (/^[a-f0-9]{6,}$/i.test(cls)) return false;
  return true;
}

/**
 * Build a single selector segment for one element.
 */
function buildSegment(el) {
  let segment = el.tagName.toLowerCase();

  if (el.id) return `#${cssEscape(el.id)}`;

  // Prefer data-testid or aria-label as strong anchors
  const testId = el.getAttribute("data-testid");
  if (testId) return `${segment}[data-testid="${cssEscape(testId)}"]`;

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.length <= 80) {
    return `${segment}[aria-label="${cssEscape(ariaLabel)}"]`;
  }

  // Add stable classes
  if (el.className && typeof el.className === "string") {
    const classes = el.className
      .trim()
      .split(/\s+/)
      .filter((c) => c && isStableClass(c));
    if (classes.length > 0) {
      segment += classes
        .slice(0, 3)
        .map((c) => `.${cssEscape(c)}`)
        .join("");
    }
  }

  // nth-of-type for disambiguation
  const parent = el.parentElement;
  if (parent) {
    const sameTag = Array.from(parent.children).filter(
      (s) => s.tagName === el.tagName
    );
    if (sameTag.length > 1) {
      segment += `:nth-of-type(${sameTag.indexOf(el) + 1})`;
    }
  }

  return segment;
}

const MAX_DEPTH = 4;

/**
 * Build a unique CSS selector for `el` by walking up at most MAX_DEPTH levels.
 * Validates uniqueness by querying the DOM; shortens when possible.
 */
function generateSelector(el) {
  if (!el || el === document.body || el === document.documentElement) {
    return "body";
  }

  if (el.id) return `#${cssEscape(el.id)}`;

  const parts = [];
  let current = el;
  let depth = 0;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement &&
    depth < MAX_DEPTH
  ) {
    const seg = buildSegment(current);
    parts.unshift(seg);

    // Stop early at strong anchor (id, data-testid, aria-label)
    if (seg.startsWith("#") || seg.includes("[data-testid=") || seg.includes("[aria-label=")) {
      break;
    }

    current = current.parentElement;
    depth++;
  }

  const fullSelector = parts.join(" > ");

  // Verify uniqueness; try progressively shorter selectors from the tail
  try {
    if (document.querySelectorAll(fullSelector).length === 1) {
      return fullSelector;
    }
  } catch (_) {}

  // Try just the last 1..N segments to find the shortest unique selector
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join(" > ");
    try {
      if (document.querySelectorAll(candidate).length === 1) {
        return candidate;
      }
    } catch (_) {}
  }

  return fullSelector;
}

/**
 * Return a short human-readable label for display in the popup.
 */
function generateLabel(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const raw = (el.textContent || "").trim();
  const text = raw.substring(0, 30);
  const suffix = text
    ? ` "${text}${raw.length > 30 ? "\u2026" : ""}"`
    : "";
  return `${tag}${id}${suffix}`;
}

/**
 * Extract the element's own direct text (excluding child elements).
 */
function getOwnText(el) {
  let text = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    }
  }
  return text.trim();
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = { generateSelector, generateLabel, isStableClass, getOwnText, buildSegment };
}
