# Rebranding for a new client

Goal: re-skin the demo for a prospect in minutes. This guide grows with each phase; the full version lands in Phase 8.

## 1. Brand defaults: `src/config/brand.ts`

Change `defaultBrand`:

- `name`, `shortName`, `tagline`, `description`
- `colors`: eight `#RRGGBB` values. Each text/background pair must reach WCAG AA contrast (4.5:1); `npm test` fails if one doesn't. Also update the matching tokens at the top of `src/app/globals.css`.
- `contact` (phone numbers in E.164, e.g. `+94771234567`), `social`, `hoursSummary`
- `features`: turn delivery, pickup, reservations, events, loyalty or alcohol on or off
- `charges`: service charge and VAT in basis points (1000 = 10%), delivery fee rules and minimum order, all in cents

At runtime, the `brand` JSON in the `settings` table overrides these defaults with no deploy (Admin → Settings). Brand colours set there are applied as CSS variables on every page.

## 2. Logo: `public/brand/`

Replace `mark.svg`, the square mark used in the header and as the app icon, copy it to `src/app/icon.svg`, and run `npm run brand:favicon` to regenerate `src/app/favicon.ico`, the home-screen icons in `public/icons/` and `src/app/apple-icon.png`. By default the brand name is set in the display font next to the mark. If the client has a full wordmark image, add it here and set `logo.wordmark` in `brand.ts`.

## 3. Photos: `src/config/media.ts`

The home hero, story, events and branches photos. Use the client's own photography where possible; otherwise free stock, recorded in `docs/CREDITS.md`.

## 4. Copy: `src/messages/{en,si,ta}.json`

The home page hero, story and About page are written for Kithul & Co. Edit the `Home` and `About` sections and their Sinhala and Tamil versions (reviewed by a native speaker). `npm test` fails if a Sinhala or Tamil message is missing or loses a placeholder; `node scripts/check-translations.mjs <si|ta> <batch.json>` checks and merges a batch of flat `"Namespace.key": "text"` translations.

## 5. Menu, branches and offers

With a database, change these in the admin panel (`/admin`). The starting data lives in `src/data/seed.ts`: branches, categories, dishes, options, prices, photos, offers, reviews and holidays. Edit it, then run `npm run db:seed` to regenerate `supabase/seed.sql`. Without a database, the site reads `seed.ts` directly.

## 6. Fonts: `src/config/fonts.ts`

Fonts are bundled at build time, so this one needs a deploy. Swap the `next/font/google` imports for `displayFont` and `bodyFont`, keeping the `variable` names. Pairings that suit the design:

| Feel                    | Display             | Body    |
| ----------------------- | ------------------- | ------- |
| Warm heritage (default) | Fraunces            | DM Sans |
| Modern clean            | Plus Jakarta Sans   | Inter   |
| Fine dining             | Cormorant Garamond  | Manrope |
| Street food, bold       | Bricolage Grotesque | Figtree |

## 7. Check it

Open `/styleguide` to see every colour, type style and component in the new brand, then click through `/`, `/menu` and `/branches` in each language.
