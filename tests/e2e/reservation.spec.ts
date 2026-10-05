import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Booking and event journeys against a real database (E2E_DATABASE=1). The
 * manager's quote needs a staff account, so that part runs only against a
 * local Supabase (CI), never a hosted project.
 */
test.skip(process.env.E2E_DATABASE !== "1", "Needs a database (set E2E_DATABASE=1)");
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);

test("a guest books a table, then cancels it", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/reservations");
  await page.locator("#main").getByText("Colombo 07", { exact: true }).click();
  // Tomorrow, so the test passes at any hour.
  await page.getByRole("radiogroup", { name: "Date" }).getByRole("radio").nth(1).click();
  const firstFree = page
    .getByRole("radiogroup", { name: "Time" })
    .getByRole("radio", { disabled: false })
    .first();
  await expect(firstFree).toBeVisible({ timeout: 15_000 });
  await firstFree.click();
  await page.getByLabel("Name").fill("Table Tester");
  await page.getByLabel("Mobile number").fill("077 000 0125");
  await page.getByLabel("Email").fill("table-e2e@example.com");

  const submit = page.getByRole("button", { name: "Book a table for 2 guests" });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.click();

  await expect(page).toHaveURL(/\/reservations\/[A-Za-z0-9_-]{32,}$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("See you soon, Table Tester!");

  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This booking is cancelled", {
    timeout: 15_000,
  });
});

test("a guest asks about an event; the manager quotes and the guest accepts", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.goto("/events");
  await page.getByLabel("Type of event").selectOption("dana");
  await page.getByLabel("Number of guests").fill("40");
  const date = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Name").fill("Event Tester");
  await page.getByLabel("Mobile number").fill("077 000 0126");
  await page.getByLabel("Email").fill("event-e2e@example.com");
  const send = page.getByRole("button", { name: "Send enquiry" });
  await expect(send).toBeEnabled({ timeout: 30_000 });
  await send.click();

  await expect(page).toHaveURL(/\/events\/[A-Za-z0-9_-]{32,}$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thanks, Event Tester! We're preparing your quote.",
  );
  const reference = (await page.getByText(/^Enquiry [A-Z0-9]{6}$/).textContent())!.slice(8);

  test.skip(!local, "The manager's part creates an account: local Supabase only");

  const admin = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const email = `manager-${randomBytes(4).toString("hex")}@example.com`;
  const password = `Mgr-${randomBytes(12).toString("base64url")}1a`;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Mala Manager" },
  });
  const { data: branch } = await admin
    .from("branches")
    .select("id")
    .eq("slug", "colombo-07")
    .single();
  await admin
    .from("profiles")
    .update({ role: "manager", branch_id: branch!.id })
    .eq("id", created.user!.id);

  const manager = await browser.newPage();
  await manager.goto("/dashboard/events");
  await manager.getByLabel("Email").fill(email);
  await manager.getByLabel("Password").fill(password);
  await manager.getByRole("button", { name: "Sign in" }).click();
  await expect(manager).toHaveURL(/\/dashboard\/events$/, { timeout: 15_000 });
  const card = manager.getByRole("article", { name: `Enquiry ${reference}` });
  await card.getByRole("button", { name: "Send quote" }).click();
  const dialog = manager.getByRole("dialog");
  await dialog.getByLabel("Total (Rs.)").fill("72000");
  await dialog.getByLabel("Deposit (Rs.)").fill("0");
  await dialog.getByRole("button", { name: "Send quote" }).click();
  await expect(manager.getByText("Quote sent.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your quote is ready");
  await expect(page.getByText("Rs. 72,000.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Accept quote" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your event is confirmed", {
    timeout: 15_000,
  });

  await admin.auth.admin.deleteUser(created.user!.id);
});
