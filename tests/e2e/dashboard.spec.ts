import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Branch dashboard journey. Creates a staff account, so it runs only against
 * a local Supabase (CI's database job), never a hosted project.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);
test.skip(process.env.E2E_DATABASE !== "1" || !local, "Needs a local Supabase");
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

test("staff accept a new order and the customer sees it live", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  // A staff member at Colombo 07, with a throwaway password for this run.
  const email = `staff-${randomBytes(4).toString("hex")}@example.com`;
  const password = `Staff-${randomBytes(12).toString("base64url")}1a`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kamala Staff" },
  });
  expect(error).toBeNull();
  const { data: branch } = await admin
    .from("branches")
    .select("id")
    .eq("slug", "colombo-07")
    .single();
  await admin
    .from("profiles")
    .update({ role: "staff", branch_id: branch!.id })
    .eq("id", created.user!.id);

  // The customer orders a pickup, paying at the counter.
  const customer = await browser.newPage();
  await customer.goto("/menu?item=chicken-kottu");
  await customer
    .getByRole("dialog", { name: "Chicken kottu" })
    .getByRole("button", { name: /Add to order/ })
    .click();
  await customer.goto("/checkout");
  await customer.getByText("Pickup", { exact: true }).click();
  await customer.locator("#main").getByText("Colombo 07", { exact: true }).click();
  await customer.getByText("Schedule for later", { exact: true }).click();
  await customer.getByLabel("Name").fill("Board Tester");
  await customer.getByLabel("Mobile number").fill("077 000 0124");
  await customer.getByLabel("Email").fill("board-e2e@example.com");
  await customer.getByText("Pay at the counter", { exact: true }).click();
  const place = customer.getByRole("button", { name: /^Place order · Rs\. / });
  await expect(place).toBeEnabled({ timeout: 30_000 });
  await place.click();
  await expect(customer).toHaveURL(/\/track\//, { timeout: 30_000 });
  const orderNumber = (await customer.getByText(/^Order [A-Z0-9]{6}$/).textContent())!.slice(6);

  // Staff sign in and land on the board.
  const staff = await browser.newPage();
  await staff.goto("/dashboard");
  await expect(staff).toHaveURL(/\/login\?next=%2Fdashboard/);
  await staff.getByLabel("Email").fill(email);
  await staff.getByLabel("Password").fill(password);
  await staff.getByRole("button", { name: "Sign in" }).click();
  await expect(staff).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(staff.getByRole("heading", { name: "Colombo 07" })).toBeVisible();

  const card = staff.getByRole("article", { name: `Order ${orderNumber}` });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText("Board Tester");
  await testInfo.attach("board", {
    body: await staff.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await card.getByRole("button", { name: "Accept" }).click();
  await expect(
    staff.getByRole("region", { name: /Accepted/ }).getByRole("article", {
      name: `Order ${orderNumber}`,
    }),
  ).toBeVisible({ timeout: 15_000 });

  // The customer's tracking page updates without a reload.
  await expect(customer.locator('[aria-current="step"]')).toContainText("Accepted", {
    timeout: 30_000,
  });

  // A kitchen ticket prints from the board.
  const [ticket] = await Promise.all([
    staff.waitForEvent("popup"),
    card.getByRole("link", { name: "Kitchen ticket" }).click(),
  ]);
  await expect(ticket.getByText(orderNumber, { exact: true })).toBeVisible();
  await testInfo.attach("kitchen ticket", {
    body: await ticket.screenshot(),
    contentType: "image/png",
  });

  // Sold-out toggles.
  await staff.goto("/dashboard/menu");
  await expect(staff.getByRole("heading", { name: "Kottu" })).toBeVisible();
  await testInfo.attach("menu availability", {
    body: await staff.screenshot(),
    contentType: "image/png",
  });

  // Customers can't open the dashboard.
  await customer.goto("/dashboard");
  await expect(customer).toHaveURL(/\/login\?next=%2Fdashboard/);

  await admin.auth.admin.deleteUser(created.user!.id);
});
