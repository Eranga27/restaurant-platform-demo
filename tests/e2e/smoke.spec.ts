import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page renders the brand", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kithul & Co.");
    // A CSP violation or hydration failure shows up as a console error.
    expect(errors).toEqual([]);
  });

  test("styleguide renders every section", async ({ page }) => {
    await page.goto("/styleguide");
    for (const section of [
      "Colour",
      "Typography",
      "Buttons",
      "Badges",
      "Cards",
      "Forms",
      "Money",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }
    await expect(page.getByText("Rs. 3,326.26")).toBeVisible();
  });
});

test.describe("security headers", () => {
  test("public pages get the baseline headers and the nonce-free CSP", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    const headers = response.headers();

    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();

    const csp = headers["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("nonce-");
  });

  test("sensitive routes get a fresh nonce on every request", async ({ request }) => {
    // The route doesn't exist yet; the proxy still sets the header on the 404.
    const first = (await request.get("/checkout")).headers()["content-security-policy"];
    const second = (await request.get("/checkout")).headers()["content-security-policy"];

    const scriptSrc = first?.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(first).not.toBe(second);
  });
});
