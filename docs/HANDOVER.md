# Handover

Status and working notes for whoever picks this project up next, person or Claude session. Last updated 9 October 2026, at v2.2.0.

**New Claude session: read this file first.** Then read `AGENTS.md` (project conventions), `docs/PLAN.md` (the original plan) and `docs/DECISIONS.md` (D1 to D94 and B1 to B7; these override the plan). Check facts against the repository: this file describes the state on the date above.

## 1. What this is

A white-label online ordering platform for Sri Lankan restaurants, built as a sales demo. The demo brand is **Kithul & Co.**, a fictional restaurant with three branches (Colombo 07, Nugegoda, Kandy). Everything brand-specific comes from configuration, so the platform can be re-skinned for a real client (`docs/REBRANDING.md`).

- **Owner:** Eranga Bowatte (GitHub `Eranga27`).
- **Live site:** <https://kithulco.vercel.app> (production, deploys `main`). The older `restaurant-platform-demo-alpha.vercel.app` redirects there.
- **Repository:** <https://github.com/Eranga27/restaurant-platform-demo> (public).
- **On the owner's laptop:** `D:\restaurant-site`, Windows 11, 16 GB RAM.

## 2. Status

Everything planned is built, merged, tagged and live. There are no open pull requests and no work in progress.

| Version | What                                                                  | PR     |
| ------- | --------------------------------------------------------------------- | ------ |
| v0.1.0  | Phase 0: setup, CI, security headers, brand config, styleguide        | #1     |
| v0.2.0  | Phase 1: public site, menu, branches, i18n scaffolding, SEO           | #2, #7 |
| v0.3.0  | Phase 2: cart, checkout, pricing engine, cash on delivery, tracking   | #8, #9 |
| v0.4.0  | Phase 3: PayHere payments, webhook, retries, refund policy            | #10    |
| v0.5.0  | Phase 4: branch dashboard, live order board, alerts, print tickets    | #11    |
| v0.6.0  | Phase 5: table bookings, events and catering, quotes, deposits        | #12    |
| v0.7.0  | Phase 6: admin panel, two-step sign-in (TOTP), reports, audit log     | #13    |
| v0.8.0  | Phase 7: accounts, reorder, loyalty, reviews, PWA, Sinhala and Tamil  | #14    |
| v0.9.0  | Phase 8: UI/UX polish (splash, scroll reveals, page transitions)      | #15    |
| v1.0.0  | Phase 9: hardening, accessibility, `/demo` tour, launch docs          | #16    |
| v1.1.0  | Phase 10: editorial redesign (chapters, map, printed menu)            | #17    |
| v1.2.0  | Home hero video with a curtain transition                             | #18    |
| v1.3.0  | Restaurant feel: Sri Lankan palette, lamp splash, offer-first home    | #20    |
| v2.0.0  | V2: staged splash, live hero, dish tabs, card menu, phone order bar   | #21    |
| v2.1.0  | Preloader "the first drop": kithul treacle poured into the logo       | #24    |
| v2.2.0  | Site uplift: sheet sections, button sweeps, page photos, booking card | #24    |

The roadmap in `docs/PLAN.md` lists eight phases; the owner later added UI/UX polish before v1.0 (D48), and after it the design overhaul, the hero video and the restaurant-feel redesign (D81 to D87). `CHANGELOG.md` has the details of each release.

**What the owner is doing now:** testing the whole site with `docs/TEST-GUIDE.md`, and working through the "Not set up yet" list in section 9.

## 3. How the owner likes to work

- **Decisions:** they delegate technical and design choices. Pick a sensible default, say what you chose, and keep going. Still ask first for anything outward-facing or account-level: making things public, deployments, service settings, anything that publishes.
- **Branches and PRs:** one branch and one PR per phase or feature, always targeting `main`, never stacked on another branch. Conventional commits.
- **Merging:** the owner merges PRs themselves. After a merge, tag `main` with an annotated tag (`git tag -a vX.Y.Z -m "..."`) and push it.
- **Database migrations:** the owner runs them on the hosted database. Write the migration in `supabase/migrations/`, then give them the one-line command `npx supabase@2.119.0 db push --yes`. Claude Code's auto mode blocks Claude from pushing to the hosted database, so don't retry it.
- **Testing:** the owner tests at the end, not after every phase. Finish the work, then explain in plain words what was built and how to test it, and update `docs/TEST-GUIDE.md`.
- **Reports:** end every status or phase report with the "Not set up yet" list (section 9). Each item gets a bold service name, what's missing, and what the site does meanwhile. Drop finished items and add new ones.
- **Style:** the owner writes briefly and often sends screenshots. Answer in plain language and keep jargon out of summaries.
- **CI:** don't poll CI in a loop. Check once when asked, or when a PR is opened.

## 4. Safety rules in force

- **Secrets:** never read, print or paste the values in `.env.local`. Check that a key is present by its name or prefix only. The owner pastes keys themselves. Never upload `.env.local` through Vercel's import: it contains a `VERCEL_OIDC_TOKEN`.
- **Accounts:** never create accounts or sign in on the hosted Supabase project or any other non-local service. Staff, admin and customer-account journeys are tested only against a local Supabase, which CI starts.
- **Test data:** use clearly fake values only: phone `077 000 0123`, `@example.com` emails, a made-up PayHere merchant.
- **Code scanning:** dismissing a CodeQL alert needs the owner's approval.
- **The owner's other projects:** port 3000 belongs to their other app (`D:\salon-site`). Never stop or reuse it. Only stop Node processes whose command line is this project's `next start` on port 3100 or 3200. Don't close the owner's apps.
- **Source video:** the original 33.5 MB `restaurant-video.mp4` sits in the repository root. `.gitignore` covers it (`/*.mp4`). Never commit it.

## 5. Accounts and services

- **GitHub:**
  - `main` is protected: the CI and CodeQL checks are required, and the rules apply to admins too.
  - Dependabot runs weekly. Major updates of `@types/node`, `typescript` and `eslint` are ignored on purpose.
  - Workflows:
    - `ci.yml`: lint, format, typecheck, unit and database tests, seed check, dependency audit, build, smoke tests; plus a database job that starts a local Supabase and runs the order, payment, dashboard and account journeys.
    - `codeql.yml`: code scanning.
    - `supabase-keepalive.yml`: pings the free project daily so it doesn't pause, once the repository has the `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` Actions secrets. Without them (the case on 9 October 2026) it skips each run and still shows a green tick.
- **Vercel:**
  - Connected to the GitHub repository. Each PR gets a preview link from the Vercel bot.
  - Production is `https://kithulco.vercel.app`. `NEXT_PUBLIC_SITE_URL` isn't set on Vercel; the site falls back to Vercel's production domain (`src/lib/public-env.ts`), which is this address. Don't test `restaurant-platform-demo.vercel.app`: it belongs to an unrelated project. The `-eranga-bowatte.vercel.app` addresses sit behind Vercel's login.
- **Supabase:**
  - Project "Sample-Restaurant", Tokyo region, Postgres 17, free plan.
  - All seven migrations in `supabase/migrations/` are applied on the hosted database.
  - The CLI is used via `npx supabase@2.119.0` and is linked on the laptop (`supabase/.temp`, not committed).
  - Email sign-in is on and "Confirm email" is off.
  - Automatic order rejection is turned off on the hosted settings (`autoRejectMinutes = 0`) until a staff login exists; the code default is 10 minutes.
  - The hosted database holds a few test orders (for example NEXC7N and "E2E Customer").
- **Not yet configured:** PayHere, Resend, Upstash, real Turnstile keys, VAPID and Telegram. See section 9.

Environment variables are listed, by name, in `.env.example` and the README.

## 6. Technical map

**Stack:**

| Area      | What's used                                                                         |
| --------- | ----------------------------------------------------------------------------------- |
| Framework | Next.js 16.3 (App Router, Turbopack, React Compiler), React 19.3, TypeScript strict |
| Styling   | Tailwind CSS 4, shadcn/ui                                                           |
| Languages | next-intl 4 (English, Sinhala, Tamil)                                               |
| Back end  | Supabase: Postgres with row-level security everywhere, Auth, Realtime, Storage      |
| Services  | PayHere, Resend, Upstash rate limiting, Cloudflare Turnstile, Web Push              |
| Motion    | CSS (scroll-driven where supported) and Lenis, loaded lazily                        |
| Tests     | Vitest (with PGlite for database and RLS tests), Playwright                         |

**This is not the Next.js in most training data.** Read the guide in `node_modules/next/dist/docs/` before writing Next.js code. Differences that came up:

- **Routing types:** `PageProps` and `RouteContext` come from `next typegen`, which `npm run typecheck` runs.
- **Proxy:** `src/proxy.ts` replaces middleware. It is not an auth boundary.
- **Images:** `next/image` uses `preload` (`priority` is deprecated).
- **Error pages:** `error.tsx` receives `retry`, and `global-error.tsx` needs its own `<html>`.
- **Page transitions:** React's `<ViewTransition>` works without extra configuration.

**Where things are:**

- **Public pages:** `src/app/[locale]/(site)/`.
- **Staff dashboard and admin:** `src/app/(staff)/`.
- **Internal pages:** `src/app/(internal)/`, the styleguide and the `/demo` tour.
- **Route handlers:** `src/app/api/`. Offline pages: `src/app/offline/`.
- **Server logic, by area:** `src/lib/`: orders, pricing, payments, reservations, events, account, reviews, security, notifications, email, and others.
- **Components, by area:** `src/components/`. The home page is in `components/home/`, and shared site parts are in `components/site/`.
- **Configuration:**
  - `src/config/brand.ts`: name, colours, charges.
  - `src/config/fonts.ts`.
  - `src/config/media.ts`: photos and the hero video.
- **Data:** `src/data/`: seed data, plus generated files (the Sri Lanka map and the hero video list).
- **Copy:** `src/messages/{en,si,ta}.json` for the interface, and `src/content/legal/` for the policies.
- **Database:**
  - `supabase/migrations/`.
  - The seed SQL is generated by `npm run db:seed`; CI checks that it's up to date.

**Generators in `scripts/`:**

| Script                                         | What it does                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `build-seed-sql.ts`                            | Writes the seed SQL (`npm run db:seed`).                                                    |
| `build-favicon.mjs`                            | Builds the favicon and app icons (`npm run brand:favicon`).                                 |
| `build-map.mjs`                                | Draws the Sri Lanka map from Natural Earth data.                                            |
| `build-hero-video.mjs`                         | Builds the hero video's files. Needs ffmpeg with SVT-AV1, which is installed on the laptop. |
| `check-translations.mjs <si\|ta> <batch.json>` | Validates a batch of translations and merges it in.                                         |

**Conventions** (also in `AGENTS.md`):

- Money is integer cents, and percentages are integer basis points (`src/lib/money.ts`).
- Never hardcode the brand: no restaurant name, colours or charges in the code.
- Server environment variables go through `src/lib/env.ts`, public ones through `src/lib/public-env.ts`.
- Check the session and role inside every protected page, Server Action and Route Handler.
- Colour tokens live in `src/app/globals.css`; a unit test enforces WCAG AA contrast.

**Design language** (D81 to D87, on top of D76 and D80):

- **Colours:** Kandyan lacquer red, saffron, curry leaf, coconut milk and kithul treacle. Three surfaces: cream, dark (`surface-ink`) and red (`surface-lacquer`).
- **Type:** Fraunces for headlines (with italic accent words), DM Sans for text and small labels, Geist Mono only for figures in the staff screens.
- **Redesign in progress** (branch `feat/redesign`, D105 to D115, "lacquer pop"): poster headlines in Bricolage Grotesque (condensed, heavy, capitals) with Fraunces italic accents; the home page rebuilt (crossed lacquer bands, plates gallery, story scrub, review wall); blinds between pages; a centred-logo header; every content page opens with a poster top (D113); the menu as dish tiles (D114); branches, about, events, contact, FAQ and the footer in the same style (D115).
- **Splash:** "kottu chop" (D106): dish names chopped to the kottu griddle's beat, the counter to 100, the name, then the panel falls apart in strips (about 3.8 s). It replaced "the first drop" (D96).
- **Home page:** the offer on the first screen with a live open badge and a chef's pick, then dish tabs, why us, offers, events, branches and guests. A sticky order bar on phones.
- **Menu:** a toolbar card, category pills with counts, and dish cards in a grid.
- **Hero:** the kitchen video with the headline, the two buttons and the reasons to order over it (`hero-scene.tsx` and `hero.tsx`). The video loads after the page, over a still of its first frame. It has a pause button. With reduced motion, data saver or 2G, only the still shows.
- **Sections and pages** (D98 to D104): home sections are rounded sheets laid over each other; inner pages share a header with a faint kolam and, on some, a photo; booking has a sticky summary card; tabs have a sliding pill; adding a dish flies its photo to the cart; buttons sweep colour on hover.
- **Motion:** everything respects `prefers-reduced-motion`.

## 7. Checking your work

- **Everyday checks:**
  - `npm run check` runs lint, formatting, the typecheck and 1,792 unit and database tests.
  - The database tests run one after another, because parallel PGlite instances run out of memory.
- **Building on the laptop:** the laptop is short of memory. A plain `npm run build` can crash with "Zone Allocation failed". Use:

  ```bash
  TURBO_TASKS_AVAILABLE_PARALLELISM=4 node --max-old-space-size=4096 node_modules/next/dist/bin/next build
  ```

- **Running the built site:** `.claude/launch.json` has a `prod` configuration (`npm run start -- --port 3200`) for the preview browser.
- **Browser tests:**

  ```bash
  PLAYWRIGHT_BASE_URL=http://localhost:3200 npx playwright test --workers=2
  ```

  - Without `PLAYWRIGHT_BASE_URL`, Playwright starts its own server on port 3100.
  - Expect 88 passed and 18 skipped. The skipped staff, account and database journeys need a local Supabase; there's no Docker on the laptop, so they run only in CI.
  - Playwright defaults to reduced motion. Tests that need motion opt in.
  - Playwright's Chromium plays AV1 video but not H.264.

- **Lighthouse:**
  - `npx lighthouse` hangs on this laptop. Install `lighthouse` into a temporary folder and run its CLI with `CHROME_PATH` set to Playwright's Chromium (`node -e "console.log(require('@playwright/test').chromium.executablePath())"`).
  - Baselines at v1.2.0, all with accessibility 100 (re-measure after v1.3.0; the fonts changed):

    | Page | Device  | Performance |
    | ---- | ------- | ----------- |
    | Home | Desktop | 95          |
    | Home | Mobile  | 70 to 76    |
    | Menu | Mobile  | 76 to 78    |

- **Shell quirks on Windows:**
  - The Bash tool is Git Bash, and long heredocs fail in it. Write scripts to a file and run them.
  - Set `MSYS_NO_PATHCONV=1` when passing `/` as an argument.
- **Before a PR:** `npm run check`, the build, and the browser tests.

## 8. Gotchas already solved

| Gotcha                                                                                                        | What to do                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A route-group `loading.tsx` made `notFound()` answer 200 and delayed hydration.                               | Keep `loading.tsx` only on checkout and account.                                                                               |
| `revalidatePath()` together with `dynamicParams = false` on the `[locale]` layout made every public page 404. | Use `refreshPublicSite()`. Never add `dynamicParams = false` back (D56).                                                       |
| Hydration error #418.                                                                                         | Client components must not rely on a layout effect having run. The splash detects hydration with `useSyncExternalStore`.       |
| The CSP nonce is added only to Next's own scripts.                                                            | Any other inline script needs the nonce passed explicitly.                                                                     |
| The next-intl plugin can't load the native `@swc/core` binary on this laptop.                                 | A Turbopack alias replaces the plugin (D13).                                                                                   |
| Next's route announcer has `role="alert"`.                                                                    | In tests, find alerts by their text.                                                                                           |
| A refused statement aborts the transaction in database tests.                                                 | Use one refused statement per `asRole`.                                                                                        |
| Managers and admins need two-step sign-in (aal2) in the database role functions.                              | The test harness defaults to aal2; tests opt into aal1.                                                                        |
| Translations break if keys, placeholders or tags drift between languages.                                     | The messages test checks Sinhala and Tamil for every key, placeholder and tag. `check-translations.mjs` checks the ICU syntax. |
| `next dev` rewrites the top block of `AGENTS.md`.                                                             | Commit it with your work.                                                                                                      |
| Clicking the home video's pause button while the splash is up makes Playwright scroll the page.               | Wait for the splash to leave first.                                                                                            |

## 9. Not set up yet (the owner's to-do list)

- **First admin account and two-step sign-in:**
  - Missing: there's no staff login on the live site yet. To create one, sign up on the live site, run the SQL in the README ("Admin panel") in the Supabase SQL editor, then set up the authenticator app at `/dashboard/security`.
  - Meanwhile: the dashboard and admin panel can't be used on the live site.
- **PayHere (paused by the owner):**
  - Missing: a sandbox merchant ID and secret.
  - Meanwhile: checkout offers cash on delivery only.
- **Automatic order rejection:**
  - Missing: it's off on the live database. Turn it back on in admin settings once someone can accept orders.
  - Meanwhile: new orders wait indefinitely.
- **Resend:**
  - Missing: an API key and a sending address.
  - Meanwhile: order and booking emails aren't sent; the server logs them instead.
- **Upstash:**
  - Missing: the Redis URL and token.
  - Meanwhile: rate limiting is off; the server logs a warning once. Add these before a real launch.
- **Turnstile:**
  - Missing: real keys.
  - Meanwhile: test keys are in use, so the bot check always passes.
- **VAPID and Telegram (optional):**
  - Missing: the keys.
  - Meanwhile: no push or Telegram alerts for staff. The dashboard's sound alerts still work.
- **Sinhala and Tamil:**
  - Missing: a native speaker's review, including the three hero video messages (`Home.heroVideoAlt`, `pauseVideo`, `playVideo`).
  - Meanwhile: the translations are unreviewed drafts.
- **Before a real client launch:** work through `docs/LAUNCH.md`: accounts, environment variables, domain, content, the client's own photos and video.

## 10. Ideas not yet requested

Offer these only if they fit what the owner asks for.

- **Mobile Lighthouse:** the framework's JavaScript and the fonts dominate on a simulated slow phone. D71 lists options.
- **HEVC hero video for iPhones:** iPhones without AV1 currently get the larger H.264 file; an HEVC version would roughly halve it.
- **A real client:** rebrand with `docs/REBRANDING.md`. The steps: `brand.ts`, the logo, `media.ts` and `build-hero-video.mjs`, the copy in three languages, and the menu seed.

## 11. Starting a new session

Paste this into the new chat, from the `D:\restaurant-site` folder:

> I'm continuing my restaurant platform project from another Claude account. Read `docs/HANDOVER.md` first, then `AGENTS.md`, `docs/PLAN.md` and `docs/DECISIONS.md`. Follow the working agreements and safety rules in the handover. Check the current state with git (branch, open PRs, latest tag) before doing anything, then tell me in a few lines what you understand and wait for my next request.
