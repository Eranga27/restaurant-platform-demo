import { expect, test, type Page } from "@playwright/test";

/** Fails the test on any console error: a CSP violation or hydration error shows up here. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

test.describe("public site", () => {
  test("home page renders the hero, signatures and branches", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Sri Lankan home cooking, done properly.",
    );
    await expect(page.getByRole("heading", { name: "Our signatures" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Colombo 07" })).toBeVisible();
    await expect(page.getByText("Demo site")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("menu lists every category and opens a dish from its link", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/menu?item=chicken-kottu");
    const dialog = page.getByRole("dialog", { name: "Chicken kottu" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Add to order · Rs\. 1,650\.00/ }),
    ).toBeVisible();

    await dialog.getByText("Large", { exact: true }).click();
    await expect(dialog.getByRole("button", { name: /Rs\. 2,100\.00/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/menu$/);

    for (const category of ["Rice & Curry", "Kottu", "Short Eats", "Desserts"]) {
      await expect(page.getByRole("heading", { level: 2, name: category })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("menu search and dietary filters narrow the list", async ({ page }) => {
    await page.goto("/menu");
    await page.getByLabel("Search the menu").fill("hopper");
    await expect(page.getByRole("heading", { level: 3, name: "Egg hoppers (2)" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Chicken kottu" })).toHaveCount(0);

    await page.getByLabel("Search the menu").fill("");
    await page.getByRole("button", { name: "Vegan" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "Vegetable kottu" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Chicken kottu" })).toHaveCount(0);
  });

  test("Sinhala pages are translated and marked up as Sinhala", async ({ page }) => {
    await page.goto("/si");
    await expect(page.locator("html")).toHaveAttribute("lang", "si");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "ශ්‍රී ලාංකේය ගෙදර කෑම, නියම විදිහට.",
    );
  });

  test("branches page shows every branch and its hours", async ({ page }) => {
    await page.goto("/branches");
    for (const name of ["Colombo 07", "Nugegoda", "Kandy"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.getByRole("region", { name: "Map showing our branches" })).toBeVisible();
  });

  test("static pages render", async ({ page }) => {
    for (const [path, title] of [
      ["/about", "Our story"],
      ["/contact", "Get in touch"],
      ["/faq", "Frequently asked questions"],
      ["/privacy", "Privacy policy"],
      ["/terms", "Terms of service"],
      ["/refunds", "Refund and cancellation policy"],
    ]) {
      await page.goto(path!);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
    }
  });

  test("unknown pages return a localized 404", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that page");
  });

  test("styleguide still renders outside the localized site", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByRole("heading", { level: 2, name: "Colour" })).toBeVisible();
  });
});

test.describe("SEO", () => {
  test("demo deployments ask crawlers to stay away", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/$/m);
  });

  test("sitemap lists pages with language alternates", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/menu</loc>");
    expect(xml).toContain('hreflang="si"');
  });

  test("pages carry canonical and hreflang links", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/menu$/);
    await expect(page.locator('link[rel="alternate"][hreflang="ta"]')).toHaveAttribute(
      "href",
      /\/ta\/menu$/,
    );
  });
});

test.describe("security headers", () => {
  test("public pages get the baseline headers and the nonce-free CSP", async ({ request }) => {
    for (const path of ["/", "/menu", "/si/branches"]) {
      const response = await request.get(path);
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
    }
  });

  test("sensitive routes get a fresh nonce on every request", async ({ request }) => {
    // The route doesn't exist yet; the proxy still sets the header on the 404.
    const first = (await request.get("/checkout")).headers()["content-security-policy"];
    const second = (await request.get("/si/checkout")).headers()["content-security-policy"];

    const scriptSrc = first?.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(second).toMatch(/'nonce-/);
    expect(first).not.toBe(second);
  });
});
