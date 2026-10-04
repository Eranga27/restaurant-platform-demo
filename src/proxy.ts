import { NextResponse, type NextRequest } from "next/server";

import { buildCsp, createNonce, needsStrictCsp } from "@/lib/security/csp";

/**
 * Runs before every page request. For now it only sets the CSP; i18n routing
 * and the Supabase session refresh join it in later phases.
 *
 * This is not an auth boundary. Every protected page, Server Action and Route
 * Handler checks the session and role itself.
 */
export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!needsStrictCsp(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", buildCsp({ isDev, supabaseOrigin }));
    return response;
  }

  const nonce = createNonce();
  const csp = buildCsp({ nonce, isDev, supabaseOrigin });

  // Next.js reads the nonce from the request's CSP header and applies it to
  // its own scripts during rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
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
    // Pages only: skip API routes, Next internals and files with an extension.
    "/((?!api/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
