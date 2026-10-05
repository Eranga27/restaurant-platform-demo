import { createHmac } from "node:crypto";

import { expect, type Page } from "@playwright/test";

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 seconds), as an authenticator app computes it. */
export function totp(base32Secret: string, at = Date.now()): string {
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

/**
 * On /dashboard/security for a new manager or admin: sets up two-step sign-in
 * the way a person would with an authenticator app, then lands on `next`.
 */
export async function setUpTwoStep(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard\/security\?next=/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
  await expect(page.getByAltText("QR code for your authenticator app")).toBeVisible();
  await page.getByText("Can't scan it? Enter this key instead").click();
  const secret = (await page.locator("details code").textContent())!.trim();
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Confirm" }).click();
}
