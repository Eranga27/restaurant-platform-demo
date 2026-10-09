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
  test("home page leads with the offer, then bestsellers and branches", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Sri Lankan home cooking, hot at your door.",
    );
    // The first screen says why to order now, and how.
    const hero = page.locator("#welcome");
    await expect(hero.getByRole("link", { name: "Order now" })).toHaveAttribute("href", "/menu");
    await expect(hero.getByText("Free delivery over Rs. 7,500")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The dishes people cross town for." }),
    ).toBeVisible();
    // Each bestseller opens its dish on the menu, ready to add.
    await expect(
      page.locator("#bestsellers").getByRole("link", { name: /Chicken kottu/ }),
    ).toHaveAttribute("href", "/menu?item=chicken-kottu");
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
      "ශ්‍රී ලාංකේය ගෙදර කෑම, උණු උණුවේ ඔබේ දොරකඩටම.",
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

  test("booking and events pages render, with or without a database", async ({ page }) => {
    await page.goto("/reservations");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /^(Book a table|Online booking isn't available right now)$/,
    );
    await page.goto("/events");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events and catering");
    await expect(page.getByRole("heading", { name: "Dana (almsgiving)" })).toBeVisible();
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

  test("the branch dashboard sends signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await page.goto("/dashboard/menu");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fmenu$/);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fsettings$/);
  });

  test("the admin's CSV export refuses anyone not signed in as an admin", async ({ request }) => {
    const response = await request.get("/admin/orders/export");
    expect(response.status()).toBe(403);
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

test.describe("installable app", () => {
  test("the manifest names the brand and its icons exist", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
    expect(manifest.name).toBeTruthy();
    for (const icon of manifest.icons as { src: string }[]) {
      expect((await request.get(icon.src)).ok()).toBe(true);
    }
  });

  test("offline pages are self-contained and locked down", async ({ request }) => {
    const { name } = await (await request.get("/manifest.webmanifest")).json();
    const response = await request.get("/offline/si.html");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-security-policy"]).toContain("default-src 'none'");
    const html = await response.text();
    expect(html).toContain('<html lang="si">');
    expect(html).toContain((name as string).replaceAll("&", "&amp;"));
    expect(html).not.toContain("<script");
    expect((await request.get("/offline/fr.html")).status()).toBe(404);
  });

  test("an installed visitor who goes offline sees the offline page in their language", async ({
    page,
    context,
  }) => {
    await page.goto("/ta");
    // Wait until the service worker controls the page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
        );
      }
    });
    await context.setOffline(true);
    try {
      await page.goto("/ta/menu");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("நீங்கள் இணைப்பில் இல்லை");
      await expect(page.getByRole("link", { name: "மீண்டும் முயலுங்கள்" })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});

test.describe("home page", () => {
  test("bestsellers are plates that open the dish on the menu", async ({ page }) => {
    await page.goto("/");
    const plates = page.locator("#bestsellers").getByRole("listitem");
    expect(await plates.count()).toBeGreaterThanOrEqual(3);
    const kottu = page
      .locator("#bestsellers")
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: "Chicken kottu" }) });
    await expect(kottu).toHaveAttribute("href", "/menu?item=chicken-kottu");
  });

  test("a keyboard user tabbing through the plates always sees the focused one", async ({
    page,
  }) => {
    await page.goto("/");
    const links = page.locator("#bestsellers li a");
    const last = links.last();
    await last.focus();
    await expect(last).toBeInViewport();
  });

  test("on a phone, the order bar comes in once the hero has gone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phones only");
    await page.goto("/");
    const bar = page.getByRole("group", { name: "Order or book", includeHidden: true });
    await expect(bar).not.toBeInViewport();
    await page.locator("#bestsellers").scrollIntoViewIfNeeded();
    await expect(bar).toBeInViewport();
    await expect(bar.getByRole("link", { name: "Order now" })).toHaveAttribute("href", "/menu");
  });
});

test.describe("motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("the splash plays once per tab and leaves by itself", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    const splash = page.locator(".site-splash");
    await expect(splash).toBeVisible();
    await expect(splash).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-splash", "seen");
    await expect(splash).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("pages people reach from emails or payments never wait for the splash", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(".site-splash")).toHaveCount(0);
  });

  test("the home video starts once the page has loaded, and stays paused when asked", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    // The splash covers the page on a first visit; it leaves by itself.
    await expect(page.locator(".site-splash")).toHaveCount(0, { timeout: 10_000 });
    const video = page.locator("video");
    await page.getByRole("button", { name: "Pause the video" }).click();
    await expect(page.getByRole("button", { name: "Play the video" })).toBeVisible();
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toMatch(/\/media\/hero\//);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);

    // The choice lasts for the visit.
    await page.reload();
    await expect(page.getByRole("button", { name: "Play the video" })).toBeVisible();
    await page.getByRole("button", { name: "Play the video" }).click();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("sections below the fold rise in as they scroll into view", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/about");
    const values = page.locator("li[data-reveal]").first();
    await expect(values).toHaveAttribute("data-reveal-state", "hidden");
    await values.scrollIntoViewIfNeeded();
    await expect(values).toHaveAttribute("data-reveal-state", /shown|done/);
    await expect(values).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a jump down the page leaves nothing above it hidden", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("li[data-reveal]").first()).toHaveAttribute(
      "data-reveal-state",
      "hidden",
    );
    // Straight to the bottom, as a fast flick or an anchor link would.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            [...document.querySelectorAll<HTMLElement>("[data-reveal-state='hidden']")].filter(
              (el) => el.getBoundingClientRect().bottom <= 0,
            ).length,
        ),
      )
      .toBe(0);
  });
});

test.describe("reduced motion", () => {
  test("the home page keeps a still of the video and doesn't download it", async ({ page }) => {
    const videos: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(".mp4")) videos.push(request.url());
    });
    await page.goto("/");
    const still = page.locator("picture img");
    await expect(still).toHaveJSProperty("complete", true);
    expect(await still.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    // Past the point where the video would have started.
    await page.evaluate(
      () => new Promise((done) => requestIdleCallback(() => setTimeout(done, 500))),
    );
    expect(videos).toEqual([]);
    await expect(page.getByRole("button", { name: /the video/ })).toHaveCount(0);
  });

  test("shows everything straight away, with no splash", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator(".site-splash")).toBeHidden();
    // Nothing waits for scrolling.
    await expect(page.locator("[data-reveal-state='hidden']")).toHaveCount(0);
  });
});

test.describe("demo tour", () => {
  test("is linked from the demo ribbon and walks through the platform", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Take the tour" }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A tour of the platform");
    await expect(page.getByRole("link", { name: "Start with kottu" })).toHaveAttribute(
      "href",
      "/menu?item=chicken-kottu",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(errors).toEqual([]);
  });
});
