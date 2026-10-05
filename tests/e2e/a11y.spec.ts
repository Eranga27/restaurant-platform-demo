import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.2 AA checks (axe) on the main customer pages, at phone and
 * desktop sizes. Covers what a machine can check: contrast, names, labels,
 * landmarks, ARIA. Keyboard and screen reader passes are manual (docs/SECURITY.md).
 */

const PAGES = [
  "/",
  "/menu",
  "/branches",
  "/about",
  "/contact",
  "/faq",
  "/reservations",
  "/events",
  "/checkout",
  "/login",
  "/signup",
  "/privacy",
  "/si",
  "/ta/menu",
  "/no-such-page",
  "/demo",
];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // Map tiles come from OpenStreetMap; their markup isn't ours to fix.
    .exclude(".leaflet-container")
    .analyze();
  return results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
}

for (const path of PAGES) {
  test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
    // "load", not "networkidle": the bot-check widget keeps the network busy.
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}

test("the dish window has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/menu?item=chicken-kottu");
  await expect(page.getByRole("dialog", { name: "Chicken kottu" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("the cart has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/menu?item=chicken-kottu");
  await page
    .getByRole("dialog", { name: "Chicken kottu" })
    .getByRole("button", { name: /Add to order/ })
    .click();
  await page.getByRole("button", { name: "Your order, 1 item" }).click();
  await expect(page.getByRole("dialog", { name: "Your order" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
