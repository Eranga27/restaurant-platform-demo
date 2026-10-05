import { createHmac, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Admin journey: sign in, set up two-step sign-in, edit a dish, see it in the
 * audit log. Creates an admin account, so it runs only against a local
 * Supabase (CI's database job), never a hosted project.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);
test.skip(process.env.E2E_DATABASE !== "1" || !local, "Needs a local Supabase");
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 seconds), as an authenticator app computes it. */
function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

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

  await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
  await expect(page.getByAltText("QR code for your authenticator app")).toBeVisible();
  await page.getByText("Can't scan it? Enter this key instead").click();
  const secret = (await page.locator("details code").textContent())!.trim();
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Confirm" }).click();

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
