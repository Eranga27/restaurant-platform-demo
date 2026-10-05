# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the phases in `docs/PLAN.md`.

## [Unreleased]

## [0.4.0] - Phase 3: Online payments

### Added

- Online payment through PayHere (cards and mobile wallets), next to cash on delivery. Checkout sends the customer to PayHere's secure page and back to the tracking page.
- Pay page for retrying a declined or cancelled payment, or switching to cash on delivery or at the counter.
- PayHere payment notifications: signature, merchant, amount and currency checks; repeats and out-of-order notifications are ignored; chargebacks and payments for cancelled orders are recorded for follow-up.
- Orders paid online wait for payment before the branch sees them. Unpaid ones are cancelled after 30 minutes and give their promo code back.
- Tracking page states for "waiting for payment" and "confirming payment", and the payment status in the order summary and confirmation email.
- A `cashOnDelivery` feature flag in the brand settings.
- Tests for PayHere signing, the payment database rules and the CSP, plus payment journeys in CI with PayHere stood in for.

### Changed

- The tracking page re-checks the order when it connects and every 20 seconds, so an update sent while connecting isn't missed.
- Confirmation emails for online orders are sent once the payment is confirmed.

## [0.3.0] - Phase 2: Cart, checkout and order tracking

### Added

- Cart: add dishes with their options from the dish sheet, change quantities, remove items. It's kept in the browser between visits and opens from the header.
- Checkout for delivery or pickup, now or scheduled (15-minute slots up to 3 days ahead). For delivery, customers drop a pin on the map and the nearest branch that delivers there is picked. Fields: district and city, address with landmark, contact details, order notes. Payment is cash on delivery; PayHere arrives in Phase 3.
- Server-side pricing: every quote and order is re-priced from the database: branch prices, sold-out items, Poya day alcohol rules, delivery radius and minimum order, opening hours, promo codes, then service charge, VAT and distance-based delivery fee.
- Promo codes WELCOME10, KOTTU200 and an expired AVURUDU26 for the demo.
- Order tracking page at an unguessable link, with live status updates (Supabase Realtime) and a fallback that refreshes every 30 seconds.
- Order confirmation email (React Email through Resend, or written to the server log when Resend isn't set up).
- Customer sign-up, sign-in and sign-out (email and password). Signed-in customers' orders are linked to their account.
- Bot protection with Cloudflare Turnstile and per-IP rate limits (Upstash) on checkout, sign-in and sign-up.
- Database: cities, promo codes, orders, order items, status history and promo redemptions, with Row Level Security and a single `place_order()` function that creates the order, its items and its first status event in one transaction.
- Tests for order pricing, quotes, schedule slots and the order database rules. A Playwright order journey (guest pickup order watched live, and a sold-out dish blocked) runs in CI against a local Supabase.

### Changed

- Session cookies are HttpOnly; the header checks the signed-in user through `/api/me`.
- Server-function logging is off in development so that order details don't appear in the terminal.

## [0.2.0] - Phase 1: Public site and menu

### Added

- Public site in English, Sinhala and Tamil (next-intl): English at `/`, Sinhala at `/si`, Tamil at `/ta`, with a language switcher in the header. Sinhala and Tamil cover the navigation, home, menu and branch pages; anything untranslated falls back to English. Translations are drafts awaiting native-speaker review.
- Header with mobile navigation, footer, skip link, demo ribbon and a Poya day banner.
- Home page: photo hero, signature dishes, current offers, branch finder with live open/closed status and "use my location", guest reviews, story and events sections.
- Menu: 53 dishes in 9 categories with sticky category tabs, search, dietary filters (vegetarian, vegan, halal, no nuts), per-branch prices and sold-out states. Alcohol is shown as unavailable on Poya days.
- Dish sheet with portion and add-on choices, spice level, special instructions, quantity and a live total. Every dish has a shareable link (`/menu?item=…`). Ordering itself arrives in Phase 2.
- Branches page with an OpenStreetMap map, opening hours, delivery radius and directions.
- About, Contact, FAQ, Privacy, Terms and Refund pages.
- Database schema with Row Level Security on every table: roles and profiles, branches, menu, options, per-branch overrides, promotions, holidays, reviews and settings.
- Demo data from a single source (`src/data/seed.ts`, generated into `supabase/seed.sql`). The site reads it directly when Supabase isn't configured.
- SEO: per-page metadata with canonical and hreflang links, Restaurant, Menu and FAQ structured data, a generated share image, sitemap and robots.txt. Indexing is off for demo deployments.
- Tests for the database access rules (on PGlite), item pricing, opening hours, phone numbers and distances, plus Playwright journeys for every public page. CI also applies the migrations and seed to the Supabase Postgres image.

## [0.1.0] - Phase 0: Setup

### Added

- Next.js 16 app (App Router, TypeScript strict, React Compiler) with Tailwind CSS 4 and shadcn/ui.
- Brand configuration (`src/config/brand.ts`) with typed defaults for Kithul & Co.: colours, contact details, feature flags and charges.
- Design tokens (spice, kithul and curry-leaf palette; Fraunces and DM Sans, with Noto Sans Sinhala and Tamil) and a hidden `/styleguide` page.
- Security headers: HSTS, frame denial, nosniff, referrer and permissions policies, and a Content-Security-Policy with per-request nonces on sensitive routes.
- Validated environment handling, with every third-party service optional during development.
- Supabase client helpers for server, browser and privileged server use.
- Money helpers that keep all amounts in integer cents.
- CI on every pull request: lint, format check, typecheck, unit tests, dependency audit, build and Playwright smoke tests. CodeQL, Dependabot and a daily Supabase keep-alive.
- Project docs: plan, decisions, security, credits and rebranding guide.
