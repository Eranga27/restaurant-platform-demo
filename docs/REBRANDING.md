# Rebranding for a new client

Goal: re-skin the demo for a prospect in minutes, and set up a real client in a day or two. Taking a client live (accounts, keys, domain) is in [LAUNCH.md](LAUNCH.md).

## 0. What to collect from the client

- Name, short name (12 characters, for the phone home screen), tagline and a one-line description
- Logo as SVG: a square mark, and a wordmark if they have one
- Brand colours (or a photo of their signage to match)
- Photos of their dishes, rooms and team
- The menu with prices, choices (portions, add-ons) and dietary information
- Each branch: address, map pin, phone, WhatsApp, email, opening hours, seats, delivery radius and fees
- Service charge, minimum delivery order, delivery fees, which features they want (delivery, pickup, cash, bookings, events, loyalty, alcohol)
- Their privacy, terms and refund wording, or approval of ours after their lawyer's review

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

## 3. Video and photos: `src/config/media.ts`

**Home video.** With ffmpeg installed, run `node scripts/build-hero-video.mjs <video> --focus 0.5`. Any length from a few seconds works; 10 to 20 seconds of steady kitchen or dining-room footage loops best. `--focus` is where the action is across the frame (0 is the left edge, 1 the right), used to cut the portrait version for phones. The script writes the files to `public/media/hero/` and lists them in `src/data/hero-video.ts`; look at the two stills it makes and commit both. Keep the original out of the repository. For a photo instead, set `heroVideo: null` and the `hero` photo is used.

**Photos.** The home hero (without a video), story, events and branches photos. Use the client's own photography where possible; otherwise free stock, recorded in `docs/CREDITS.md`.

## 4. Copy: `src/messages/{en,si,ta}.json`

The home page hero, story and About page are written for Kithul & Co. Edit the `Home` and `About` sections and their Sinhala and Tamil versions (reviewed by a native speaker). `npm test` fails if a Sinhala or Tamil message is missing or loses a placeholder; `node scripts/check-translations.mjs <si|ta> <batch.json>` checks and merges a batch of flat `"Namespace.key": "text"` translations.

The splash screen's welcome is `Splash.greeting` in each language file. The splash pours a drop into the brand's own mark (`logo.mark`), so it shows the new logo with no extra work; its colours come from the theme (`highlight` for the drop, `foreground` for the screen). The drop lands a little below the mark's middle, where the Kithul mark's drop is round: for a mark shaped differently, change `--land` on `.site-splash` in `src/app/globals.css`. The lotus ornament and footer border take the brand's `accent` (turmeric by default), `primary` and `secondary` colours, so they follow a new palette too.

## 5. Menu, branches and offers

With a database, change these in the admin panel (`/admin`). The starting data lives in `src/data/seed.ts`: branches, categories, dishes, options, prices, photos, offers, reviews and holidays. Edit it, then run `npm run db:seed` to regenerate `supabase/seed.sql`. Without a database, the site reads `seed.ts` directly.

## 6. Fonts: `src/config/fonts.ts`

Fonts are bundled at build time, so this one needs a deploy. Swap the `next/font/google` imports for `displayFont` (headlines, with an italic for the accent words), `bodyFont` (text, and small labels and prices on the public site) and `monoFont` (figures in the staff screens), keeping the `variable` names. Pairings that suit the design:

| Feel                    | Display (with italic) | Body    | Labels        |
| ----------------------- | --------------------- | ------- | ------------- |
| Warm heritage (default) | Fraunces              | DM Sans | Geist Mono    |
| Editorial               | Instrument Serif      | Geist   | Geist Mono    |
| Fine dining             | Cormorant Garamond    | Manrope | IBM Plex Mono |
| Street food, bold       | Bricolage Grotesque   | Figtree | Space Mono    |

## 7. Settings that need no deploy

Once the site runs on Supabase, Admin → Settings changes the name, contact details, colours (contrast-checked), features, charges, loyalty rates, booking and event rules. Admin → Menu, Branches, Holidays and Promo codes cover the rest. Changes appear within a few minutes.

## 8. Policies

`src/content/legal` holds the privacy, terms and refund text. It's a template for a fictional restaurant: the client's lawyer must review it (Sri Lanka's Personal Data Protection Act, PayHere's requirements) before launch.

## 9. Check it

Open `/styleguide` to see every colour, type style and component in the new brand, then click through `/`, `/menu` and `/branches` in each language. `npm test` fails if a colour pair misses WCAG AA contrast or a translation loses a placeholder; `npm run test:e2e` runs the accessibility checks (axe) on the main pages.
