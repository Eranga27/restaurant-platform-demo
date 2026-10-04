import { z } from "zod";

/**
 * Zod schemas for the database rows the public site reads. Both data sources
 * (Supabase and the seed fallback) are parsed through these, so the app sees
 * one validated shape.
 */

export const i18nText = z.object({
  en: z.string(),
  si: z.string().optional(),
  ta: z.string().optional(),
});
export const partialI18nText = i18nText.partial();
export type I18nText = z.infer<typeof i18nText>;

const uuid = z.uuid();
const timeRange = z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)]);
const dayHours = z.array(timeRange);

export const openingHoursSchema = z.object({
  mon: dayHours,
  tue: dayHours,
  wed: dayHours,
  thu: dayHours,
  fri: dayHours,
  sat: dayHours,
  sun: dayHours,
});
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const deliveryFeeRulesSchema = z.object({
  baseFeeCents: z.number().int().min(0),
  includedKm: z.number().min(0),
  perKmCents: z.number().int().min(0),
  freeAboveCents: z.number().int().min(0).nullable(),
});
export type DeliveryFeeRules = z.infer<typeof deliveryFeeRulesSchema>;

export const branchRow = z.object({
  id: uuid,
  slug: z.string(),
  name_i18n: i18nText,
  address_line: z.string(),
  city: z.string(),
  district: z.string(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  phone: z.string(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  delivery_radius_km: z.coerce.number(),
  delivery_fee_rules: deliveryFeeRulesSchema,
  opening_hours: openingHoursSchema,
  seating_capacity: z.number().int(),
  image_path: z.string().nullable(),
  is_accepting_orders: z.boolean(),
  sort_order: z.number().int(),
});

export const categoryRow = z.object({
  id: uuid,
  slug: z.string(),
  name_i18n: i18nText,
  description_i18n: partialI18nText,
  sort_order: z.number().int(),
});

export const dietaryTag = z.enum(["vegetarian", "vegan", "halal", "contains-nuts"]);
export type DietaryTag = z.infer<typeof dietaryTag>;

export const menuItemRow = z.object({
  id: uuid,
  category_id: uuid,
  slug: z.string(),
  name_i18n: i18nText,
  description_i18n: partialI18nText,
  base_price_cents: z.number().int().min(0),
  image_path: z.string().nullable(),
  dietary_tags: z.array(dietaryTag),
  spice_selectable: z.boolean(),
  is_alcohol: z.boolean(),
  is_signature: z.boolean(),
  sort_order: z.number().int(),
});

export const itemOptionRow = z.object({
  id: uuid,
  menu_item_id: uuid,
  name_i18n: i18nText,
  selection: z.enum(["single", "multiple"]),
  is_required: z.boolean(),
  max_select: z.number().int().positive().nullable(),
  sort_order: z.number().int(),
});

export const itemOptionValueRow = z.object({
  id: uuid,
  option_id: uuid,
  name_i18n: i18nText,
  price_delta_cents: z.number().int(),
  is_default: z.boolean(),
  sort_order: z.number().int(),
});

export const branchMenuOverrideRow = z.object({
  branch_id: uuid,
  menu_item_id: uuid,
  price_cents: z.number().int().min(0).nullable(),
  is_available: z.boolean(),
});

export const promotionRow = z.object({
  id: uuid,
  slug: z.string(),
  title_i18n: i18nText,
  body_i18n: partialI18nText,
  image_path: z.string().nullable(),
  cta_label_i18n: i18nText.nullable(),
  cta_href: z.string().nullable(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  sort_order: z.number().int(),
});

export const holidayRow = z.object({
  id: uuid,
  date: z.string(),
  kind: z.enum(["poya", "public", "festival"]),
  name_i18n: i18nText,
  is_alcohol_free: z.boolean(),
});

export const reviewRow = z.object({
  id: uuid,
  branch_id: uuid.nullable(),
  author_name: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string(),
  created_at: z.string(),
});

export type BranchRow = z.infer<typeof branchRow>;
export type CategoryRow = z.infer<typeof categoryRow>;
export type MenuItemRow = z.infer<typeof menuItemRow>;
export type ItemOptionRow = z.infer<typeof itemOptionRow>;
export type ItemOptionValueRow = z.infer<typeof itemOptionValueRow>;
export type BranchMenuOverrideRow = z.infer<typeof branchMenuOverrideRow>;
export type PromotionRow = z.infer<typeof promotionRow>;
export type HolidayRow = z.infer<typeof holidayRow>;
export type ReviewRow = z.infer<typeof reviewRow>;
