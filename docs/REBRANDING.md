# Rebranding for a new client

Goal: re-skin the demo for a prospect in minutes. This guide grows with each phase; the full version lands in Phase 8.

## 1. Brand defaults: `src/config/brand.ts`

Change `defaultBrand`:

- `name`, `shortName`, `tagline`, `description`
- `colors`: eight `#RRGGBB` values. Each text/background pair must reach WCAG AA contrast (4.5:1); `npm test` fails if one doesn't.
- `contact`, `social`, `hoursSummary`
- `features`: turn delivery, pickup, reservations, events, loyalty or alcohol on or off
- `charges`: service charge and VAT in basis points (1000 = 10%), delivery fee rules and minimum order, all in cents

From Phase 1, the same values can be changed at runtime in **Admin → Settings** with no deploy. The settings row overrides these defaults.

## 2. Logo: `public/brand/`

Replace `mark.svg`, the square mark used in the header and as the app icon, and copy it to `src/app/icon.svg` for the favicon. By default the brand name is set in the display font next to the mark. If the client has a full wordmark image, add it here and set `logo.wordmark` in `brand.ts`.

## 3. Fonts: `src/config/fonts.ts`

Fonts are bundled at build time, so this one needs a deploy. Swap the `next/font/google` imports for `displayFont` and `bodyFont`, keeping the `variable` names. Pairings that suit the design:

| Feel                    | Display             | Body    |
| ----------------------- | ------------------- | ------- |
| Warm heritage (default) | Fraunces            | DM Sans |
| Modern clean            | Plus Jakarta Sans   | Inter   |
| Fine dining             | Cormorant Garamond  | Manrope |
| Street food, bold       | Bricolage Grotesque | Figtree |

## 4. Check it

Open `/styleguide` to see every colour, type style and component in the new brand.
