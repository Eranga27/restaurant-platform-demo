import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { setUpTwoStep } from "./helpers/two-step";

/**
 * Admin journey: sign in, set up two-step sign-in, edit a dish, see it in the
 * audit log. Creates an admin account, so it runs only against a local
 * Supabase (CI's database job), never a hosted project.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);
test.skip(process.env.E2E_DATABASE !== "1" || !local, "Needs a local Supabase");
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

test("an admin sets up two-step sign-in, edits a dish and sees it audited", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const email = `admin-${randomBytes(4).toString("hex")}@example.com`;
  const password = `Adm-${randomBytes(12).toString("base64url")}1a`;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Ayesha Admin" },
  });
  await admin.from("profiles").update({ role: "admin" }).eq("id", created.user!.id);

  // Signing in lands on the two-step setup: admins can't skip it.
  await page.goto("/admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/security\?next=%2Fadmin/, { timeout: 15_000 });
  await setUpTwoStep(page);

  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await testInfo.attach("overview", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // Change a dish's price.
  await page.goto("/admin/menu");
  await page.getByRole("link", { name: "Egg hoppers" }).click();
  await page.getByLabel("Price (Rs.)").fill("190");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Dish saved.")).toBeVisible();
  await testInfo.attach("dish editor", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // The change is in the audit log, with who made it.
  await page.goto("/admin/audit?entity=menu_items");
  await expect(page.getByText("Ayesha Admin").first()).toBeVisible();
  await expect(page.getByText(/base_price_cents: \d+ → 19000/)).toBeVisible();

  // Settings refuse unreadable colours.
  await page.goto("/admin/settings");
  await page.getByLabel("Text on main colour", { exact: true }).fill("#6b3a1e");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText(/too hard to read/)).toBeVisible();

  await admin.auth.admin.deleteUser(created.user!.id);
});
