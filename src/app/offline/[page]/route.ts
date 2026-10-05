import { createTranslator } from "next-intl";

import { loadMessages } from "@/i18n/messages";
import { routing, type Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { formatPhone } from "@/lib/phone";

/**
 * The page the site's service worker (public/offline-sw.js) shows when a page
 * can't load because the visitor is offline: /offline/en.html, si.html, ta.html.
 * Self-contained (no scripts, styles inline, no images), because nothing else
 * can load. The ".html" keeps it outside the proxy and locale routing.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ page: `${locale}.html` }));
}

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export async function GET(_request: Request, { params }: RouteContext<"/offline/[page]">) {
  const { page } = await params;
  const locale = routing.locales.find((l) => page === `${l}.html`);
  if (!locale) return new Response("Not found", { status: 404 });

  const [brand, messages] = await Promise.all([getBrand(), loadMessages(locale as Locale)]);
  const t = createTranslator({ locale, messages, namespace: "Offline" });
  const { colors } = brand;
  const phone = brand.contact.phone;
  const callLink = `<a href="tel:${phone}">${escape(formatPhone(phone))}</a>`;

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="${colors.primary}">
<title>${escape(t("title"))} · ${escape(brand.name)}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    box-sizing: border-box; background: ${colors.background}; color: ${colors.foreground};
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Sinhala", "Noto Sans Tamil", sans-serif; }
  main { max-width: 26rem; text-align: center; }
  .brand { font: 600 1.1rem/1.2 Georgia, "Noto Serif Sinhala", "Noto Serif Tamil", serif; color: ${colors.primary};
    letter-spacing: .02em; margin: 0 0 2rem; }
  h1 { font: 600 1.75rem/1.25 Georgia, "Noto Serif Sinhala", "Noto Serif Tamil", serif; margin: 0 0 .75rem; color: ${colors.primary}; }
  p { margin: 0 0 1.5rem; }
  a.retry { display: inline-block; padding: .75rem 1.5rem; border-radius: 999px; text-decoration: none;
    background: ${colors.primary}; color: ${colors.primaryForeground}; font-weight: 600; }
  a.retry:focus-visible, .call a:focus-visible { outline: 3px solid ${colors.accent}; outline-offset: 3px; }
  .call { margin-top: 2rem; font-size: .9rem; }
  .call a { color: ${colors.primary}; font-weight: 600; }
</style>
</head>
<body>
<main>
  <p class="brand">${escape(brand.name)}</p>
  <h1>${escape(t("title"))}</h1>
  <p>${escape(t("body"))}</p>
  <a class="retry" href="">${escape(t("retry"))}</a>
  <p class="call">${escape(t("call", { phone: "{phone}" })).replace("{phone}", callLink)}</p>
</main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Nothing on this page needs scripts, frames or other origins.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
