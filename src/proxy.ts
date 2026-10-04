import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { buildCsp, createNonce, needsStrictCsp } from "@/lib/security/csp";

const handleI18nRouting = createIntlMiddleware(routing);

/** Areas outside the localized site: English only, no locale prefix. */
const UNLOCALIZED_PREFIXES = ["/styleguide", "/dashboard", "/admin"];

/**
 * Runs before every page request: locale routing (next-intl) and the CSP.
 * The Supabase session refresh joins it in Phase 2.
 *
 * This is not an auth boundary. Every protected page, Server Action and Route
 * Handler checks the session and role itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const strict = needsStrictCsp(pathname);
  const nonce = strict ? createNonce() : undefined;
  const csp = buildCsp({ nonce, isDev, supabaseOrigin });

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
