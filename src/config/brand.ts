import { z } from "zod";

/**
 * Brand defaults for the demo restaurant.
 *
 * Everything a prospect would want changed lives here. At runtime the single
 * row in the `settings` table is merged over these values (see `getBrand()`),
 * so most rebrands need no code change at all. Fonts are the exception: they
 * are bundled at build time, see `src/config/fonts.ts`.
 */

const e164 = z.string().regex(/^\+94[0-9]{9}$/, "Expected a Sri Lankan number in E.164 format");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #RRGGBB colour");
const localized = z.object({
  en: z.string(),
  si: z.string().optional(),
  ta: z.string().optional(),
});

/** Percentages are stored as basis points so all money maths stays integer. 1000 = 10%. */
const basisPoints = z.number().int().min(0).max(10_000);
const cents = z.number().int().min(0);

export const featureFlagsSchema = z.object({
  delivery: z.boolean(),
  pickup: z.boolean(),
  dineIn: z.boolean(),
  reservations: z.boolean(),
  events: z.boolean(),
  loyalty: z.boolean(),
  /** Cash on delivery or at pickup. Online payment appears whenever PayHere is configured. */
  cashOnDelivery: z.boolean(),
  /** When on, alcohol items are hidden automatically on Poya days. */
  alcohol: z.boolean(),
});

export const brandColorsSchema = z.object({
  primary: hex,
  primaryForeground: hex,
  secondary: hex,
  secondaryForeground: hex,
  accent: hex,
  accentForeground: hex,
  background: hex,
  foreground: hex,
});

export const chargesSchema = z.object({
  serviceChargeBps: basisPoints,
  vatBps: basisPoints,
  /** Default rules; each branch can override them. */
  delivery: z.object({
    baseFeeCents: cents,
    includedKm: z.number().min(0),
    perKmCents: cents,
    freeAboveCents: cents.nullable(),
  }),
  minimumOrderCents: cents,
});

export const brandSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1).max(12),
  tagline: z.string(),
  description: z.string(),
  logo: z.object({
    /** Square mark, used in the header, favicon and app icon. */
    mark: z.string(),
    /** Optional full wordmark image. When null, the name is set in the display font next to the mark. */
    wordmark: z.string().nullable(),
  }),
  colors: brandColorsSchema,
  contact: z.object({
    /** E.164, e.g. +94110000700 */
    phone: e164,
    email: z.email(),
    whatsapp: e164.nullable(),
    address: z.string(),
  }),
  social: z.object({
    facebook: z.url().nullable(),
    instagram: z.url().nullable(),
    tiktok: z.url().nullable(),
    youtube: z.url().nullable(),
  }),
  /** Shown in the footer. Per-branch hours live on the branch record. */
  hoursSummary: z.string(),
  features: featureFlagsSchema,
  charges: chargesSchema,
  orders: z.object({
    /** Orders not accepted within this many minutes are rejected automatically. 0 turns it off. */
    autoRejectMinutes: z.number().int().min(0).max(120),
  }),
  /** Loyalty points (docs/DECISIONS.md B2, D58). */
  loyalty: z.object({
    /** Food spend (after discounts) for one point. */
    pointPerCents: z.number().int().min(100),
    /** What one point takes off a bill. */
    pointValueCents: z.number().int().min(1),
    /** The most points may take off, as a share of the food total after a promo code. */
    maxRedeemBps: z.number().int().min(0).max(10_000),
  }),
  /** Online table bookings (docs/DECISIONS.md D42). */
  reservations: z.object({
    slotMinutes: z.number().int().min(15).max(60),
    /** How long a table is held. Parties of `largePartySize` or more get `largePartyMinutes`. */
    seatingMinutes: z.number().int().min(30).max(240),
    largePartySize: z.number().int().min(2),
    largePartyMinutes: z.number().int().min(30).max(300),
    /** Share of a branch's seats bookable online (basis points); the rest is for walk-ins. */
    onlineShareBps: z.number().int().min(0).max(10_000),
    maxPartySize: z.number().int().min(1).max(50),
    minNoticeMinutes: z.number().int().min(0),
    maxDaysAhead: z.number().int().min(1).max(365),
    /** No new seatings this close to closing time. */
    lastSeatingMinutes: z.number().int().min(0),
    /** Guests can cancel online until this long before their time. */
    cancelUntilMinutes: z.number().int().min(0),
  }),
  /** Events and catering enquiries (D45). */
  events: z.object({
    minGuests: z.number().int().min(1),
    maxGuests: z.number().int().min(1),
    minNoticeDays: z.number().int().min(0),
    /** Suggested deposit when quoting, in basis points of the quote. */
    defaultDepositBps: z.number().int().min(0).max(10_000),
    packages: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          name: localized,
          description: localized,
          /** Guide price per guest; the quote is the real price. */
          fromPerGuestCents: z.number().int().min(0),
        }),
      )
      .min(1),
  }),
  currency: z.literal("LKR"),
  timeZone: z.string(),
});

export type Brand = z.infer<typeof brandSchema>;
export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
export type BrandColors = z.infer<typeof brandColorsSchema>;

export const defaultBrand = brandSchema.parse({
  name: "Kithul & Co.",
  shortName: "Kithul & Co",
  tagline: "Sri Lankan Kitchen",
  description:
    "Slow-cooked curries, smoky kottu and hoppers fresh off the pan. Sri Lankan home cooking from three kitchens across the island.",
  logo: {
    mark: "/brand/mark.svg",
    wordmark: null,
  },
  colors: {
    // Kandyan lacquer red
    primary: "#8c1d18",
    primaryForeground: "#fff8ef",
    // Curry leaf green
    secondary: "#1f4a36",
    secondaryForeground: "#f4faf5",
    // Saffron and turmeric
    accent: "#e9a31a",
    accentForeground: "#2b1608",
    // Coconut milk
    background: "#fbf5ea",
    // Kithul treacle, almost black
    foreground: "#1f1410",
  },
  contact: {
    // 000 blocks: unlikely to be anyone's real number. Calls are disabled in demo mode.
    phone: "+94110000700",
    email: "hello@kithul.example",
    whatsapp: "+94770000700",
    address: "42 Flower Road, Colombo 07",
  },
  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    tiktok: null,
    youtube: null,
  },
  hoursSummary: "Open daily 11:00 to 22:30",
  features: {
    delivery: true,
    pickup: true,
    dineIn: false,
    reservations: true,
    events: true,
    loyalty: true,
    cashOnDelivery: true,
    alcohol: true,
  },
  charges: {
    serviceChargeBps: 1000,
    // 18% as of 2024. Verify the current rate before any live launch.
    vatBps: 1800,
    delivery: {
      baseFeeCents: 250_00,
      includedKm: 3,
      perKmCents: 60_00,
      freeAboveCents: 7500_00,
    },
    minimumOrderCents: 1500_00,
  },
  orders: { autoRejectMinutes: 10 },
  loyalty: { pointPerCents: 100_00, pointValueCents: 1_00, maxRedeemBps: 2000 },
  reservations: {
    slotMinutes: 30,
    seatingMinutes: 90,
    largePartySize: 7,
    largePartyMinutes: 120,
    onlineShareBps: 6000,
    maxPartySize: 12,
    minNoticeMinutes: 120,
    maxDaysAhead: 30,
    lastSeatingMinutes: 60,
    cancelUntilMinutes: 120,
  },
  events: {
    minGuests: 10,
    maxGuests: 1000,
    minNoticeDays: 3,
    defaultDepositBps: 2500,
    packages: [
      {
        id: "rice-and-curry",
        name: { en: "Rice and curry buffet" },
        description: {
          en: "Red or yellow rice with chicken or fish curry, dhal, three vegetable curries, mallum, papadam and wattalappan.",
        },
        fromPerGuestCents: 2400_00,
      },
      {
        id: "kottu-night",
        name: { en: "Kottu and devilled night" },
        description: {
          en: "Live kottu station, devilled chicken and prawns, hot butter cuttlefish, string hopper biryani and fresh juices.",
        },
        fromPerGuestCents: 3200_00,
      },
      {
        id: "dana",
        name: { en: "Dana (almsgiving)" },
        description: {
          en: "A traditional vegetarian dana for the Sangha and guests: rice, seven curries, kiribath and sweets, served or delivered.",
        },
        fromPerGuestCents: 1800_00,
      },
      {
        id: "custom",
        name: { en: "Something else" },
        description: { en: "Tell us what you have in mind and we'll put a menu together." },
        fromPerGuestCents: 0,
      },
    ],
  },
  currency: "LKR",
  timeZone: "Asia/Colombo",
} satisfies Brand);
