import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Full order journey against a real database. Runs when E2E_DATABASE=1 (CI
 * starts a local Supabase for it); skipped otherwise, because ordering needs
 * a database.
 */
test.skip(process.env.E2E_DATABASE !== "1", "Needs a database (set E2E_DATABASE=1)");
// One browser profile is enough here; the journey itself is what's under test.
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

test("a guest orders kottu for pickup and watches it update live", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Add a large, Sri Lankan Hot chicken kottu from its shareable link.
  await page.goto("/menu?item=chicken-kottu");
  const dish = page.getByRole("dialog", { name: "Chicken kottu" });
  await dish.getByText("Large", { exact: true }).click();
  await dish.getByText("Sri Lankan Hot", { exact: true }).click();
  await dish.getByRole("button", { name: /Add to order · Rs\. 2,100\.00/ }).click();
  await expect(page.getByRole("button", { name: "Your order, 1 item" })).toBeVisible();

  // Checkout: pickup from Colombo 07, scheduled so the test passes at any hour.
  await page.goto("/checkout");
  await page.getByText("Pickup", { exact: true }).click();
  await page.getByText("Schedule for later", { exact: true }).click();
  await page.getByLabel("Name").fill("E2E Customer");
  await page.getByLabel("Mobile number").fill("077 000 0199");
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByText("Pay at the counter", { exact: true }).click();

  const place = page.getByRole("button", { name: /^Place order · Rs\. / });
  // Waits for the server quote and Cloudflare's test Turnstile token.
  await expect(place).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByText("Rs. 2,100.00").first()).toBeVisible();
  await place.click();

  await expect(page).toHaveURL(/\/track\/[A-Za-z0-9_-]{32,}$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thanks, E2E Customer! We've got your order.",
  );
  await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 15_000 });

  // The branch accepts it (Phase 4 does this from the dashboard): the page updates without a reload.
  const token = page.url().split("/track/")[1]!;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false },
    },
  );
  const { error } = await admin
    .from("orders")
    .update({ status: "accepted" })
    .eq("public_token", token);
  expect(error).toBeNull();
  // Live, or at worst on the page's periodic re-check.
  await expect(page.locator('[aria-current="step"]')).toContainText("Accepted", {
    timeout: 30_000,
  });

  // The cart was emptied after ordering.
  await expect(page.getByRole("button", { name: "Your order is empty" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("checkout re-prices on the server and blocks a sold-out dish", async ({ page }) => {
  await page.goto("/menu?item=dolphin-kottu");
  await page
    .getByRole("dialog", { name: "Dolphin kottu" })
    .getByRole("button", { name: /Add to order/ })
    .click();

  // Move the cart to Nugegoda, where dolphin kottu is sold out, then check out.
  await page.goto("/checkout");
  await page.getByText("Pickup", { exact: true }).click();
  await page.locator("#main").getByText("Nugegoda", { exact: true }).click();
  await expect(
    page.getByText("Dolphin kottu is sold out at this branch. Remove it to continue."),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("button", { name: /Place order|Continue to payment/ }),
  ).toBeDisabled();
});
