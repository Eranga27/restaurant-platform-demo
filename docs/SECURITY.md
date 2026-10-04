# Security

How the platform is protected, and the checklist the final review (Phase 8) works through. Items are ticked as each phase delivers them.

## Principles

1. **Assume the public Supabase key is in an attacker's hands.** It ships to every browser. Anyone can call PostgREST, Auth and Realtime directly, bypassing our UI, our proxy and our rate limits. Row Level Security (RLS) must hold on its own.
2. **Customers never write orders, payments or prices directly.** Those writes happen only in Server Actions or Route Handlers using the secret key, after Zod validation and an explicit authorisation check. RLS is the backstop, not the only guard.
3. **The proxy is not an auth boundary.** It sets headers and refreshes sessions. Every protected page, Server Action and Route Handler checks the session and role itself.
4. **The server recalculates every price.** The cart is only item IDs, options and quantities.
5. **A payment is real only when PayHere's server-to-server notification verifies.** The browser's return URL proves nothing.

## Headers

Set for every response in `next.config.ts`, with the CSP set per request in `src/proxy.ts`.

| Header                     | Value                                                                                            | Why                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Content-Security-Policy    | See below                                                                                        | Limits where scripts, frames and connections can come from                                           |
| Strict-Transport-Security  | `max-age=63072000; includeSubDomains; preload`                                                   | HTTPS only                                                                                           |
| X-Frame-Options            | `DENY`                                                                                           | Clickjacking (backed by CSP `frame-ancestors 'none'`)                                                |
| X-Content-Type-Options     | `nosniff`                                                                                        | MIME sniffing                                                                                        |
| Referrer-Policy            | `strict-origin-when-cross-origin`                                                                | Order tokens in URLs never leak to other sites                                                       |
| Permissions-Policy         | Camera, microphone, USB, serial, Bluetooth, Topics off; geolocation and payment same-origin only |                                                                                                      |
| Cross-Origin-Opener-Policy | `same-origin`                                                                                    | Isolates the browsing context. Revisit if PayHere's popup needs `same-origin-allow-popups` (Phase 3) |
| X-Powered-By               | Removed                                                                                          |                                                                                                      |

### Content-Security-Policy

Two levels (docs/DECISIONS.md D4, D5):

- **Strict routes** (`/account`, `/admin`, `/checkout`, `/dashboard`, `/login`, `/signup`, `/track`, in any locale): `script-src 'self' 'nonce-…' 'strict-dynamic'`. A fresh nonce per request; Next.js applies it to its own scripts. These pages render dynamically.
- **Public pages** (home, menu, branches, static pages): `script-src 'self' 'unsafe-inline'` so they can be static or ISR. They render no user-supplied content.
- **Both:** `style-src 'self' 'unsafe-inline'` (React style attributes, animation libraries and Leaflet need it); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`; Supabase allowed only for the configured project origin (HTTPS and WSS).

Unit tests in `tests/unit/csp.test.ts` pin these rules. The smoke tests check the headers on a production build.

## OWASP Top 10 (2021) checklist

| Risk                                           | Control                                                                                                                                   | Status                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| A01 Broken access control                      | RLS on every table, with tests per role; server-side role guard on every dashboard/admin route and action; unguessable order tokens       | Planned (Phases 1, 4, 6, 8)                  |
| A02 Cryptographic failures                     | HTTPS only (HSTS); secrets only in env vars; no card data ever touches our servers (PayHere hosted page)                                  | Headers done (Phase 0)                       |
| A03 Injection                                  | Zod validation on every server input; parameterised queries via supabase-js; no `dangerouslySetInnerHTML` (ESLint `react/no-danger`); CSP | Lint rule and CSP done (Phase 0)             |
| A04 Insecure design                            | Server-side pricing; idempotency keys on orders; webhook-only payment confirmation; documented decisions                                  | Planned (Phases 2, 3)                        |
| A05 Security misconfiguration                  | Security headers; `poweredByHeader: false`; env validation; storage bucket policies                                                       | Headers done (Phase 0)                       |
| A06 Vulnerable components                      | Dependabot; `npm audit` (production deps) in CI; CodeQL                                                                                   | Done (Phase 0)                               |
| A07 Identification and authentication failures | Supabase Auth with secure cookies; TOTP MFA for admins and managers; rate limits and backoff on login                                     | Planned (Phases 2, 4, 6)                     |
| A08 Software and data integrity failures       | PayHere `md5sig` verification and amount/currency check; lockfile + `npm ci`; branch protection with required CI                          | CI done (Phase 0); PayHere planned (Phase 3) |
| A09 Logging and monitoring failures            | Audit log of staff/admin actions; raw payment payloads stored                                                                             | Planned (Phases 3, 6)                        |
| A10 Server-side request forgery                | No user-supplied URLs are fetched server-side; image hosts allow-listed in `next.config.ts`                                               | Done (Phase 0)                               |

## Known dev-only advisories

`npm audit` reports a high-severity issue in `braces`, pulled in by ESLint's tooling (`eslint-config-next` → `fast-glob`). It runs only on developer machines and CI, never in the deployed app, and has no upstream fix yet. CI audits production dependencies only (`npm audit --omit=dev`).

## Reporting

This is a demo. Report issues privately to the repository owner rather than opening a public issue.
