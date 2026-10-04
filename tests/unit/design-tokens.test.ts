import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { contrast } from "./helpers/contrast";

/** Reads the hex tokens declared in the `:root` block of globals.css. */
function readRootTokens(): Record<string, string> {
  const css = readFileSync(
    fileURLToPath(new URL("../../src/app/globals.css", import.meta.url)),
    "utf8",
  );
  const root = css.match(/:root\s*{([\s\S]*?)}/)?.[1] ?? "";
  return Object.fromEntries(
    [...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, name, value]) => [name, value]),
  );
}

const tokens = readRootTokens();
const t = (name: string) => {
  const value = tokens[name];
  if (!value) throw new Error(`Token --${name} not found in globals.css`);
  return value;
};

describe("design tokens", () => {
  it.each([
    "background",
    "card",
    "popover",
    "primary",
    "secondary",
    "highlight",
    "accent",
    "destructive",
    "success",
    "warning",
    "info",
  ])("--%s-foreground on --%s meets WCAG AA", (name) => {
    const fg = name === "background" ? t("foreground") : t(`${name}-foreground`);
    expect(contrast(fg, t(name))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    "muted-foreground",
    "primary",
    "secondary",
    "destructive",
    "success",
    "warning",
    "info",
    "spice-mild",
    "spice-medium",
    "spice-hot",
    "diet-veg",
    "diet-vegan",
    "diet-halal",
    "diet-nuts",
  ])("--%s is readable as text on the page and on cards", (name) => {
    expect(contrast(t(name), t("background"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t(name), t("card"))).toBeGreaterThanOrEqual(4.5);
  });

  it("--muted-foreground is readable on --muted", () => {
    expect(contrast(t("muted-foreground"), t("muted"))).toBeGreaterThanOrEqual(4.5);
  });

  it("--ring is visible against the background (WCAG 2.2 non-text 3:1)", () => {
    expect(contrast(t("ring"), t("background"))).toBeGreaterThanOrEqual(3);
  });

  it("--input borders identify form fields on the page and on cards (3:1)", () => {
    expect(contrast(t("input"), t("background"))).toBeGreaterThanOrEqual(3);
    expect(contrast(t("input"), t("card"))).toBeGreaterThanOrEqual(3);
  });
});
