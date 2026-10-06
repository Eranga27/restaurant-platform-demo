# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the phases in `docs/PLAN.md`.

## [Unreleased]

## [1.3.0] - Restaurant feel

### Added

- A Sri Lankan palette: Kandyan lacquer red, saffron, curry leaf, coconut milk and kithul treacle. New logo and app icon colours.
- A new splash: an oil lamp (magul pahana) drawn in saffron lights its flame, then the red panel lifts away like a curtain.
- The home page's first screen now carries the offer: the headline over the kitchen video, "Order now" and "Book a table", the guest rating, free delivery over Rs. 7,500, cash on delivery and halal options.
- Bestsellers as cards with photo, price and "Add"; steam rises off the plate on hover.
- "Why guests come back": three short reasons beside a photo.
- A rating summary beside the guest quotes.

### Changed

- Headlines in Fraunces and text in DM Sans; small labels lose their numbers and the monospaced face.
- A calmer headline scale, softer cards and rounder corners.
- The home page keeps the essentials: bestsellers, why us, offers, branches, guests, events.
- Menu and dish prices in whole rupees ("Rs. 1,450"). The cart and checkout keep cents.

### Removed

- The chapter labels and guide, the moving category band, the sideways signature row (and GSAP), and the cursor follower.

### Fixed

- Sections could stay blank after a quick scroll or a jump down the page.
- The old splash's welcome line never animated (its animation was missing).

## [1.2.0] - Hero video

### Added

- The home page opens on a full-screen video of the kitchen, on its own under the header. Scrolling, the headline slides up over it on a sheet of paper while the video sinks back and dims.
- A pause button on the video; the choice lasts for the visit.
- A portrait cut of the video for phones, so it stays sharp on a tall screen.
- `scripts/build-hero-video.mjs`: turns a client's video into the hero's files (seamless loop, two cuts, AV1 and H.264, stills).

### Changed

- The video went from 33.5 MB to 3.5 MB on desktop and 2.2 MB on phones, with no visible loss.
- It loads after the page, over a still of its first frame; with reduced motion, data saver or a 2G connection, only the still shows.

## [1.1.0] - Phase 10: Design overhaul

### Added

- A new editorial look: very large serif headlines with italic accents, a clean sans for text, small monospaced chapter labels, pill buttons, and dark "ink" sections alternating with warm paper.
- The home page as chapters: a full-screen hero under a transparent header, a moving band of the menu's categories, an opening statement with live counts, a pinned sideways row of signature dishes, this week's offers as a numbered list, a Sri Lanka map with every branch pinned, large guest quotes, the story and celebrations.
- A floating chapter guide ("03 / 07 · Our kitchens") with a progress line on large screens.
- Smooth scrolling for mouse and trackpad, headlines that rise word by word, and a cursor that labels dishes.
- A full-screen "Explore" menu with every page in large type, the branches' numbers and the time in Sri Lanka.
- A new footer: a last invitation to order or book, and the brand name edge to edge.
- Kolam line patterns and a lotus border as Sri Lankan details.
- The menu set like a printed menu, with numbered categories and dotted leaders to the prices.

### Changed

- Every content page opens with a large title whose last word is in italic.
- The splash screen is larger on desktop, in the new typeface.
- Fonts weigh about half as much as before (83 KB on a first visit).

### Fixed

- The offers heading and the branch count no longer name Kithul & Co. or "three" in the translations.

## [1.0.0] - Phase 9: Hardening and launch

### Added

- A demo tour at `/demo` for client meetings, linked from the demo ribbon: the demo script step by step, and what's included.
- A launch checklist (docs/LAUNCH.md): accounts, environment variables, database, content, domain, final checks and quality results.
- Database guard tests for the whole schema: RLS everywhere, what the public and signed-in roles can read, write and call, and fixed search paths.
- Accessibility checks (axe, WCAG 2.2 AA) on 16 pages and the dish and cart windows, at phone and desktop sizes, in CI.
- A per-account limit on sign-in attempts from any address.
- The full rebranding guide: what to collect from a client, settings that need no deploy, policies.

### Changed

- Rate-limit keys are hashed, so no email or IP address is stored at Upstash.
- Faster on phones: the cart drawer, phone menu and toasts load when first used; the language menu uses the phone's own picker; the heading font no longer competes with the hero photo; the splash's welcome no longer downloads the Sinhala and Tamil fonts on English pages.
- The hero's line of places is built from the branch list.

### Removed

- The unused `CRON_SECRET` setting.

## [0.9.0] - Phase 8: UI/UX polish

### Added

- A branded splash screen on the first visit in a tab: the brand mark opens like a lotus, with "Welcome · ආයුබෝවන් · வணக்கம்". Only on the public pages, never on checkout, tracking, payments or account pages.
- Page transitions: the old page fades out and the new one rises in, with the header held still.
- Scroll animations: headings, dish cards, offers, branches, reviews and photos rise in as they come into view, a few at a time.
- The home hero enters line by line, its photo drifts gently as you scroll, and photo bands move with a slight parallax.
- A lotus ornament above section headings, a lotus border along the footer, and quote marks on reviews.
- The header gains a soft shadow once the page scrolls; desktop menu links get a turmeric underline.
- On phones, a "View order" bar at the bottom of the menu once something is in the order, and the cart badge pops when a dish is added.
- Loading screens for checkout and account pages, and a friendly error page with "Try again" in all three languages.
- Ornament and motion sections in the styleguide.

### Changed

- Dishes without a photo show a lotus placeholder.
- Browser tests run with reduced motion; new smoke tests check the splash, the reveals and reduced-motion behaviour.
- Everything that moves is switched off for visitors who ask for reduced motion.

## [0.8.0] - Phase 7: Extras

### Added

- Customer accounts at `/account`:
  - Overview: loyalty points with their history, and the customer's name and mobile number, which fill in checkout and bookings.
  - Orders: past orders, a link to each one's tracking page, and "Order again", which puts the same dishes and choices back in the cart at today's prices.
  - Bookings: table bookings and event enquiries.
  - Addresses: up to 10 saved addresses with a map pin.
- Saved addresses at checkout: pick one, or tick "Save this address" when ordering.
- Loyalty points: a point for every Rs 100 of food, earned when an order is completed, and spent at checkout (a point takes Rs 1 off, up to 20% of the food). Points used on a rejected or cancelled order come back. The rates are in Admin → Settings.
- Reviews: after an order is completed, its tracking page asks "How was it?". Reviews appear on the site once an admin approves them in Admin → Reviews.
- Installable app: a web app manifest and app icons, and an offline page in English, Sinhala or Tamil when the connection drops.
- Sinhala and Tamil translations for every customer-facing page and email.
- "My account" in the header for signed-in customers.
- Tests for addresses, points, reviews, reorder, translations, the offline page, and a customer account journey in CI.

### Changed

- The public API no longer returns which account wrote a review.
- `scripts/check-translations.mjs` checks a batch of translations (placeholders, tags, message syntax) and merges it.

### Fixed

- The Sinhala and Tamil home page heading now uses the brand's own tagline instead of a fixed one.

## [0.7.0] - Phase 6: Admin panel

### Added

- Admin panel at `/admin`:
  - Overview: revenue by day, top dishes, order type and payment split, by branch, for any date range.
  - Orders across branches with filters and CSV export.
  - Bookings calendar.
  - Menu: dishes with translations, photos, choices and per-branch prices and availability, plus categories.
  - Branches: details, map pin, delivery fees, opening hours, Telegram alerts and photo.
  - Holidays and promo codes.
  - Payments: refunds owed and flagged PayHere notifications.
  - Staff: add, invite, change roles and branches, reset two-step sign-in.
  - Settings: name, contact, colours with contrast checks, features, charges, booking and event rules.
  - Audit log.
- Two-step sign-in (authenticator app) for managers and admins, at `/dashboard/security`; optional for staff.
- Audit log of every admin and staff change.
- Image storage bucket for menu and branch photos.

### Changed

- Manager and admin rights need two-step sign-in in the session; without it they're treated as signed in, not as staff.

### Fixed

- Marking a dish sold out (or any admin change) no longer takes the public pages down on self-hosted servers: on-demand page refreshes now use the locale route pattern, and the locale layout accepts on-demand rendering.

## [0.6.0] - Phase 5: Reservations and events

### Added

- Table booking at `/reservations`: choose a branch, day, number of guests and a free time, plus seating and occasion. Confirmed straight away, with an email and a private link to view or cancel.
- Capacity rules: a share of each branch's seats is bookable online, tables are held 90 or 120 minutes, and the database stops double-booking.
- Events and catering at `/events`: menus to start from, and an enquiry form for birthdays, office events, almsgivings, weddings and homecomings, at a branch or at the guest's venue.
- A private enquiry page where guests see the quote, accept or decline it, and pay the deposit through PayHere (when it's set up).
- Dashboard tabs: Reservations (a day's bookings with seat, finish, no-show and cancel) and Events (the New, Quoted, Confirmed and Closed pipeline, with the quote form for managers and admins).
- Emails for bookings (confirmed, cancelled) and events (received, quoted, confirmed, declined), and branch alerts for new enquiries.
- "Book a table" and "Events" in the header and footer; the home page buttons now lead there.
- Tests for slot and capacity rules and the booking and event database rules, plus booking and enquiry journeys.

### Changed

- Database tests run one file at a time, so the in-memory databases don't run out of memory.
- PayHere notifications now cover event deposits as well as orders.

## [0.5.0] - Phase 4: Branch dashboard

### Added

- Branch dashboard at `/dashboard` for staff, managers and admins: a live order board with New, Accepted, Preparing, Ready / on the way and Done columns.
- Accept, reject with a reason, start preparing, ready or out for delivery, and complete, with only the allowed next steps offered. Customers see each change live on their tracking page.
- Alerts for new orders: a chime that repeats while an order waits (after "Start shift"), Web Push on staff devices, and optional Telegram messages.
- Auto-reject for orders not accepted in time (10 minutes by default, configurable in settings), with a countdown on the card.
- Menu availability page to mark dishes sold out, and a switch to pause online orders for the branch.
- Kitchen tickets and customer receipts sized for 80 mm thermal printers.
- A dashboard link in the site header for signed-in staff.
- Tests for the dashboard database rules, and a staff journey in CI (sign in, accept an order, print a ticket).

### Changed

- Staff can no longer write menu overrides directly (which would have let them change prices); availability goes through a checked function.
- Rejected and cancelled orders give their promo code back.

### Fixed

- Signing in from a link to the dashboard now lands on the dashboard instead of a localized 404.

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
