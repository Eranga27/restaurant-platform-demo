import { describe, expect, it } from "vitest";

import { buildCsp, createNonce, needsStrictCsp } from "@/lib/security/csp";

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `));
}

describe("needsStrictCsp", () => {
  it.each([
    "/checkout",
    "/checkout/confirm",
    "/si/checkout",
    "/ta/account/orders",
    "/admin",
    "/dashboard/orders",
    "/track/abc123",
    "/login",
  ])("is strict for %s", (path) => {
    expect(needsStrictCsp(path)).toBe(true);
  });

  it.each([
    "/",
    "/menu",
    "/si",
    "/si/menu",
    "/about",
    "/admins-guide",
    "/styleguide",
    "/en/branches",
  ])("is relaxed for %s", (path) => {
    expect(needsStrictCsp(path)).toBe(false);
  });
});

describe("buildCsp", () => {
  it("uses a nonce and strict-dynamic, with no unsafe-inline scripts, when given a nonce", () => {
    const csp = buildCsp({ nonce: "abc", isDev: false });
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toContain("'nonce-abc'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("allows inline scripts without a nonce for static pages", () => {
    const csp = buildCsp({ isDev: false });
    expect(directive(csp, "script-src")).toContain("'unsafe-inline'");
    expect(directive(csp, "script-src")).not.toContain("nonce-");
  });

  it("always forbids framing, plugins and base-tag hijacking", () => {
    for (const csp of [buildCsp({ isDev: false }), buildCsp({ nonce: "n", isDev: false })]) {
      expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(directive(csp, "object-src")).toBe("object-src 'none'");
      expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
      expect(csp).toContain("upgrade-insecure-requests");
    }
  });

  it("only allows eval in development", () => {
    expect(directive(buildCsp({ isDev: true }), "script-src")).toContain("'unsafe-eval'");
    expect(buildCsp({ isDev: true })).not.toContain("upgrade-insecure-requests");
  });

  it("scopes Supabase to the configured project, including realtime websockets", () => {
    const csp = buildCsp({ isDev: false, supabaseOrigin: "https://abc.supabase.co" });
    const connect = directive(csp, "connect-src");
    expect(connect).toContain("https://abc.supabase.co");
    expect(connect).toContain("wss://abc.supabase.co");
    expect(connect).not.toContain("*.supabase.co");
  });
});

describe("createNonce", () => {
  it("returns a fresh base64 value each call", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
