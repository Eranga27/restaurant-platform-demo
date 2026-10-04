import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { buildCsp, createNonce, needsStrictCsp } from "@/lib/security/csp";
import { hardenCookie } from "@/lib/supabase/cookies";

const handleI18nRouting = createIntlMiddleware(routing);

/** Areas outside the localized site: English only, no locale prefix. */
const UNLOCALIZED_PREFIXES = ["/styleguide", "/dashboard", "/admin"];

/**
 * Runs before every page request: locale routing (next-intl), the CSP, and on
 * account, checkout and staff routes a Supabase session refresh.
 *
 * This is not an auth boundary. Every protected page, Server Action and Route
 * Handler checks the session and role itself.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const strict = needsStrictCsp(pathname);
  const nonce = strict ? createNonce() : undefined;
  const csp = buildCsp({ nonce, isDev, supabaseOrigin: originOf(supabaseUrl) });

  // Refresh an expiring session before the page renders. Only where a session
  // matters, so public static pages don't pay for a round trip to Supabase.
  const refreshed: { name: string; value: string; options: CookieOptions }[] = [];
  if (strict && supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
            refreshed.push(cookie);
          }
        },
      },
    });
    await supabase.auth.getClaims();
  }

  if (nonce) {
    // Next.js reads the nonce from the request's CSP header while rendering.
    // next-intl copies request headers into its rewrite, so setting them here
    // reaches the page either way.
    request.headers.set("x-nonce", nonce);
    request.headers.set("Content-Security-Policy", csp);
  }

  const unlocalized = UNLOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const response = unlocalized
    ? NextResponse.next({ request: { headers: request.headers } })
    : handleI18nRouting(request);

  for (const { name, value, options } of refreshed) {
    response.cookies.set(name, value, hardenCookie(options));
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

export const config = {
  matcher: [
    // Pages only: skip API routes, Next internals, Vercel internals and files with an extension.
    "/((?!api/|_next/|_vercel/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
