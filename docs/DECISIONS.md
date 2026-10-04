# Decisions

Changes to, and clarifications of, `docs/PLAN.md`. Agreed 2026-10-04 before Phase 0. Where this file and the plan disagree, this file wins.

## Stack

| #   | Decision                                                                                                                                       | Reason                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1  | **Next.js 16** (not 15), Tailwind 4, Zod 4, React Compiler on                                                                                  | 16 is the current stable. Request interception lives in `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`).       |
| D2  | Cache Components (`cacheComponents`) stays **off**                                                                                             | PPR is incompatible with nonce CSP, and next-intl support is still partial. Classic ISR (`revalidate`) covers the menu. |
| D3  | Supabase: **hosted free project** for development and the demo; the **full local Supabase stack runs in GitHub Actions** for RLS and E2E tests | No Docker on the dev machine. Actions runners have Docker.                                                              |

## Security headers

| #   | Decision                                                                                                                                                                                                                                                        | Reason                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D4  | **Two CSP levels.** Nonce + `strict-dynamic` on routes that handle accounts, orders or staff data (`/checkout`, `/account`, `/track`, `/dashboard`, `/admin`, `/login`). A nonce-free CSP (`script-src 'self' 'unsafe-inline'`) on public marketing/menu pages. | Nonces force dynamic rendering, which would remove static/ISR pages and hurt the Lighthouse target. Public pages render no user-supplied content.                                                                               |
| D5  | `style-src 'self' 'unsafe-inline'` on all routes                                                                                                                                                                                                                | React SSR `style={}` attributes, Framer Motion and Leaflet need inline styles. A nonce in `style-src` would make browsers ignore `'unsafe-inline'` and break them. Script injection is the real XSS risk and stays locked down. |

## Repository & workflow

| #   | Decision                                                                                                  | Reason                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D6  | GitHub repo **public**, `Eranga27/restaurant-platform-demo`, no open-source licence (all rights reserved) | Branch protection, CodeQL and secret-scanning push protection are only free on public repos. No licence means nobody may legally reuse the code. |
| D7  | **No `dev` branch.** `feat/phase-N-*` → PR into `main` → tag `v0.N.0`                                     | Solo developer; `dev` adds a merge step with no benefit.                                                                                         |
| D8  | Pause for review at the end of each phase                                                                 |                                                                                                                                                  |

## Accounts & services

| #   | Decision                                                                                                                                                                                                    | Reason                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| D9  | Every third-party service is optional at runtime with a local fallback: emails print to the console, Turnstile uses Cloudflare's published test keys, rate limiting is a no-op, Telegram alerts are skipped | Development never blocks on an account. Production must set the real keys (checked in `src/lib/env.ts`). |
| D10 | No email domain yet. Resend and Supabase Auth emails only reach the account owner's inbox until a domain is verified                                                                                        | Resend's free tier and Supabase's built-in SMTP both restrict recipients.                                |
| D11 | "OTP" in the plan means email OTP and TOTP. No SMS                                                                                                                                                          | SMS providers are paid.                                                                                  |

## Demo

| #   | Decision                                                                                                                                   | Reason                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| D12 | `/demo` shows the demo admin's TOTP setup secret/QR; a nightly GitHub Action re-seeds demo data (same workflow as the Supabase keep-alive) | Public test logins need MFA to be passable, and anyone can edit the demo. |

## Business rules (defaults, all configurable in `settings`)

| #   | Rule                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Bill order: subtotal → promo discount → service charge (10%) → VAT on (subtotal − discount + service charge) → delivery fee (no VAT). Default VAT 18%, flagged "verify before going live". All amounts integer cents, rounded half-up per line. |
| B2  | Loyalty: earn 1 point per Rs. 100 of subtotal after discount; redeem 1 point = Rs. 1, capped at 20% of the bill.                                                                                                                                |
| B3  | Delivery radius is straight-line (haversine) distance from the branch.                                                                                                                                                                          |
| B4  | Poya and other holidays live in a dated table admins can edit, seeded from the official calendar.                                                                                                                                               |
| B5  | `/dashboard` and `/admin` are English only.                                                                                                                                                                                                     |
| B6  | Auto-reject of unaccepted orders runs on Supabase `pg_cron` (Vercel Hobby cron is daily only).                                                                                                                                                  |
| B7  | The branch dashboard has a "Start shift" button that unlocks audio (browser autoplay rules).                                                                                                                                                    |
