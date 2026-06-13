import { describe, expect, it } from "vitest";
import { applyA11y, ensureSrOnlyStyles, srOnly } from "./a11y.js";

describe("applyA11y", () => {
  it("sets string attributes", () => {
    const el = document.createElement("button");
    applyA11y(el, { "aria-label": "Start game", role: "button" });
    expect(el.getAttribute("aria-label")).toBe("Start game");
    expect(el.getAttribute("role")).toBe("button");
  });

  it("sets boolean true as empty attribute and removes false", () => {
    const el = document.createElement("div");
    applyA11y(el, { "aria-hidden": true });
    expect(el.hasAttribute("aria-hidden")).toBe(true);
    expect(el.getAttribute("aria-hidden")).toBe("");

    applyA11y(el, { "aria-hidden": false });
    expect(el.hasAttribute("aria-hidden")).toBe(false);
  });

  it("skips null and undefined values", () => {
    const el = document.createElement("div");
    el.setAttribute("data-keep", "yes");
    applyA11y(el, { "data-test": null, "data-other": undefined });
    expect(el.hasAttribute("data-test")).toBe(false);
    expect(el.hasAttribute("data-other")).toBe(false);
    expect(el.getAttribute("data-keep")).toBe("yes");
  });
});

describe("srOnly", () => {
  it("creates a visually hidden span", () => {
    const span = srOnly("Hidden label");
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toBe("sr-only");
    expect(span.textContent).toBe("Hidden label");
  });
});

describe("ensureSrOnlyStyles", () => {
  it("injects sr-only styles once", () => {
    document.head.querySelectorAll("style").forEach((node) => node.remove());
    ensureSrOnlyStyles();
    ensureSrOnlyStyles();
    const styles = [...document.head.querySelectorAll("style")].filter((node) =>
      node.textContent?.includes(".sr-only"),
    );
    expect(styles).toHaveLength(1);
  });
});
