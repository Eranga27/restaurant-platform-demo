import { createHash } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

/**
 * Online payment journeys against a real database, with PayHere stood in for:
 * the checkout post to PayHere is intercepted, and the test sends the signed
 * server notification PayHere would send. Runs when E2E_DATABASE=1 and a
 * (test) PayHere merchant is configured; CI sets both.
 */
test.skip(
  process.env.E2E_DATABASE !== "1" || !process.env.PAYHERE_MERCHANT_SECRET,
  "Needs a database and a test PayHere merchant",
);
test.skip(({ isMobile }) => !isMobile, "Runs on the mobile project only");

const md5 = (value: string) => createHash("md5").update(value).digest("hex").toUpperCase();
const secretHash = () => md5(process.env.PAYHERE_MERCHANT_SECRET!);

/** Orders a kottu for pickup, chooses online payment and returns the fields posted to PayHere. */
async function checkOutAndCapturePayHere(page: Page): Promise<Record<string, string>> {
  await page.goto("/menu?item=chicken-kottu");
  await page
    .getByRole("dialog", { name: "Chicken kottu" })
    .getByRole("button", { name: /Add to order/ })
    .click();

  let posted: Record<string, string> | null = null;
  await page.route("https://sandbox.payhere.lk/pay/checkout", async (route) => {
    posted = Object.fromEntries(new URLSearchParams(route.request().postData() ?? ""));
    await route.fulfill({ contentType: "text/html", body: "<h1>PayHere (test stand-in)</h1>" });
  });

  await page.goto("/checkout");
  await page.getByText("Pickup", { exact: true }).click();
  await page.getByText("Schedule for later", { exact: true }).click();
  await page.getByLabel("Name").fill("Payment Tester");
  await page.getByLabel("Mobile number").fill("077 000 0123");
  await page.getByLabel("Email").fill("payment-e2e@example.com");
  await page.getByText("Pay online", { exact: true }).click();

  const pay = page.getByRole("button", { name: /^Continue to payment · Rs\. / });
  await expect(pay).toBeEnabled({ timeout: 30_000 });
  await pay.click();
  await expect(page.getByRole("heading", { name: "PayHere (test stand-in)" })).toBeVisible({
    timeout: 30_000,
  });
  expect(posted).not.toBeNull();
  return posted!;
}

function notification(fields: Record<string, string>, statusCode: string) {
  const base = {
    merchant_id: fields.merchant_id!,
    order_id: fields.order_id!,
    payment_id: "320025071278",
    payhere_amount: fields.amount!,
    payhere_currency: fields.currency!,
    status_code: statusCode,
    method: "VISA",
    status_message: statusCode === "2" ? "Successfully completed" : "Declined",
    card_holder_name: "PAYMENT TESTER",
    card_no: "************1292",
  };
  return {
    ...base,
    md5sig: md5(
      base.merchant_id +
        base.order_id +
        base.payhere_amount +
        base.payhere_currency +
        base.status_code +
        secretHash(),
    ),
  };
}

const pathOf = (url: string) => {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
};

test("a customer pays online and the order goes to the branch", async ({ page, request }) => {
  test.setTimeout(120_000);
  const fields = await checkOutAndCapturePayHere(page);

  // The form is signed on the server for the stored total.
  expect(fields.order_id).toMatch(/^[A-Z0-9]{6}-1$/);
  expect(fields.currency).toBe("LKR");
  expect(fields.amount).toMatch(/^\d+\.\d{2}$/);
  expect(fields.hash).toBe(
    md5(fields.merchant_id! + fields.order_id! + fields.amount! + fields.currency! + secretHash()),
  );
  expect(fields.notify_url).toMatch(/\/api\/payments\/payhere\/notify$/);
  expect(fields.phone).toBe("0770000123");

  // Coming back from PayHere proves nothing: the order still waits.
  await page.goto(pathOf(fields.return_url!));
  await expect(page.getByText("Confirming your payment…")).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 15_000 });

  // A forged notification is refused.
  const forged = await request.post("/api/payments/payhere/notify", {
    form: { ...notification(fields, "2"), md5sig: "0".repeat(32) },
  });
  expect(forged.status()).toBe(401);

  // PayHere's signed notification marks it paid; the open page updates live.
  const genuine = await request.post("/api/payments/payhere/notify", {
    form: notification(fields, "2"),
  });
  expect(genuine.status()).toBe(200);
  await expect(page.locator('[aria-current="step"]')).toContainText("Received", {
    timeout: 30_000,
  });
  await expect(page.getByText(/^Paid online: Rs\. /)).toBeVisible();

  // Repeats are harmless.
  const again = await request.post("/api/payments/payhere/notify", {
    form: notification(fields, "2"),
  });
  expect(again.status()).toBe(200);
});

test("a declined payment can be retried or paid in cash instead", async ({ page, request }) => {
  test.setTimeout(120_000);
  const fields = await checkOutAndCapturePayHere(page);

  const declined = await request.post("/api/payments/payhere/notify", {
    form: notification(fields, "-2"),
  });
  expect(declined.status()).toBe(200);

  // PayHere sends the customer back to the pay page.
  await page.goto(pathOf(fields.cancel_url!));
  await expect(page.getByRole("heading", { name: "Complete your payment" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("You cancelled the payment");

  // Retrying opens a second attempt.
  await page.getByRole("button", { name: "Pay securely with PayHere" }).click();
  await expect(page.getByRole("heading", { name: "PayHere (test stand-in)" })).toBeVisible({
    timeout: 30_000,
  });

  // Back again, the customer chooses to pay at the counter.
  await page.goto(pathOf(fields.cancel_url!));
  await page.getByRole("button", { name: "Pay at the counter instead" }).click();
  await expect(page).toHaveURL(/\/track\/[A-Za-z0-9_-]{32,}$/, { timeout: 15_000 });
  await expect(page.locator('[aria-current="step"]')).toContainText("Received");
  await expect(page.getByText(/^Pay Rs\. .+ at the counter\.$/)).toBeVisible();
});
