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
    // Kithul treacle brown
    primary: "#6b3a1d",
    primaryForeground: "#fffaf2",
    // Curry leaf green
    secondary: "#2f5a3a",
    secondaryForeground: "#f6fbf5",
    // Turmeric gold
    accent: "#e0a526",
    accentForeground: "#2a1a0e",
    // Coconut cream
    background: "#fbf6ee",
    foreground: "#2a1d14",
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
  currency: "LKR",
  timeZone: "Asia/Colombo",
} satisfies Brand);
