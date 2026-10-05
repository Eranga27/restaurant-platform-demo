import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Customer account journey: spend points at checkout, earn them back, review
 * the order and order it again. Creates an account, so it runs only against a
 * local Supabase (CI's database job), never a hosted project.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);
test.skip(process.env.E2E_DATABASE !== "1" || !local, "Needs a local Supabase");
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

test("a customer pays with points, reviews the order and orders it again", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  // A customer with 500 points, and a throwaway password for this run.
  const email = `customer-${randomBytes(4).toString("hex")}@example.com`;
  const password = `Guest-${randomBytes(12).toString("base64url")}1a`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Ruwani Account" },
  });
  expect(error).toBeNull();
  const userId = created.user!.id;
  await admin.from("loyalty_ledger").insert({ user_id: userId, points: 500, reason: "adjusted" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("#main").getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  // A chicken kottu (Rs 1,650) for pickup. Points can pay up to a fifth: Rs 330.
  await page.goto("/menu?item=chicken-kottu");
  await page
    .getByRole("dialog", { name: "Chicken kottu" })
    .getByRole("button", { name: /Add to order/ })
    .click();
  await page.goto("/checkout");
  await page.getByText("Pickup", { exact: true }).click();
  await page.locator("#main").getByText("Colombo 07", { exact: true }).click();
  await page.getByText("Schedule for later", { exact: true }).click();
  await page.getByLabel("Name").fill("Ruwani Account");
  await page.getByLabel("Mobile number").fill("077 000 0125");
  await page.getByLabel("Email").fill(email);
  await page.getByText("Pay at the counter", { exact: true }).click();
  await page.getByRole("switch", { name: /Use my 500 points/ }).click();
  await expect(page.getByText("Points (330)").first()).toBeVisible({ timeout: 15_000 });

  const place = page.getByRole("button", { name: /^Place order · Rs\. / });
  await expect(place).toBeEnabled({ timeout: 30_000 });
  await place.click();
  await expect(page).toHaveURL(/\/track\/[A-Za-z0-9_-]{32,}$/, { timeout: 30_000 });
  await expect(page.getByText("Points (330)").first()).toBeVisible();

  // The branch completes it: (Rs 1,650 − Rs 330) earns 13 points.
  const token = page.url().split("/track/")[1]!;
  const { error: completeError } = await admin
    .from("orders")
    .update({ status: "completed" })
    .eq("public_token", token);
  expect(completeError).toBeNull();

  // Review it from the tracking page; it waits for an admin to approve it.
  await page.reload();
  await expect(page.getByRole("heading", { name: "How was it?" })).toBeVisible();
  await page.getByRole("radio", { name: "5 stars" }).check({ force: true });
  await page.getByLabel("Tell us about it").fill("Hot, generous and properly spicy.");
  await page.getByRole("button", { name: "Send review" }).click();
  await expect(page.getByText("Thank you for your review!")).toBeVisible();
  const { data: review } = await admin
    .from("reviews")
    .select("status, rating")
    .eq("user_id", userId)
    .single();
  expect(review).toEqual({ status: "pending", rating: 5 });

  // 500 − 330 + 13 points, with the history behind them.
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ruwani");
  await expect(page.getByText("183", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Earned on order /)).toBeVisible();

  // Order it again: the same dish goes back in the cart.
  await page.goto("/account/orders");
  await page.getByRole("button", { name: "Order again" }).click();
  await expect(page).toHaveURL(/\/checkout$/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Your order, 1 item" })).toBeVisible();

  await admin.auth.admin.deleteUser(userId);
  expect(errors).toEqual([]);
});
