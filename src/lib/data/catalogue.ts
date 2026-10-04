import "server-only";

import type { Locale } from "@/i18n/routing";
import { mediaUrl } from "@/lib/supabase/public";

import { getBrand } from "./brand";
import type { DeliveryFeeRules, DietaryTag, I18nText, OpeningHours } from "./rows";
import { getPublicRows, todayInColombo } from "./source";

/**
 * Localized, page-ready views of the public catalogue. Pages render one
 * language at a time, so translation happens here on the server and client
 * components receive plain strings.
 */

export function localize(text: Partial<I18nText> | null | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.en || "";
}

export type BranchView = {
  id: string;
  slug: string;
  name: string;
  addressLine: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  deliveryRadiusKm: number;
  deliveryFeeRules: DeliveryFeeRules;
  openingHours: OpeningHours;
  seatingCapacity: number;
  imageUrl: string | null;
  isAcceptingOrders: boolean;
};

export type MenuOptionValueView = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
};

export type MenuOptionView = {
  id: string;
  name: string;
  selection: "single" | "multiple";
  isRequired: boolean;
  maxSelect: number | null;
  values: MenuOptionValueView[];
};

export type MenuItemView = {
  id: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  name: string;
  description: string;
  basePriceCents: number;
  imageUrl: string | null;
  dietaryTags: DietaryTag[];
  spiceSelectable: boolean;
  isAlcohol: boolean;
  isSignature: boolean;
  options: MenuOptionView[];
};

export type MenuCategoryView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  items: MenuItemView[];
};

/** branchId → menuItemId → override. Missing entries mean base price, available. */
export type BranchOverrides = Record<
  string,
  Record<string, { priceCents: number | null; isAvailable: boolean }>
>;

export type HolidayView = {
  date: string;
  kind: "poya" | "public" | "festival";
  name: string;
  isAlcoholFree: boolean;
};

export type MenuView = {
  categories: MenuCategoryView[];
  overrides: BranchOverrides;
  /** Alcohol is hidden entirely when the brand doesn't serve it. */
  alcoholEnabled: boolean;
  /** Set on Poya days: alcohol is shown but can't be ordered. */
  alcoholFreeToday: HolidayView | null;
};

export async function getBranches(locale: Locale): Promise<BranchView[]> {
  const { branches } = await getPublicRows();
  return branches.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: localize(b.name_i18n, locale),
    addressLine: b.address_line,
    city: b.city,
    district: b.district,
    lat: b.lat,
    lng: b.lng,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    deliveryRadiusKm: b.delivery_radius_km,
    deliveryFeeRules: b.delivery_fee_rules,
    openingHours: b.opening_hours,
    seatingCapacity: b.seating_capacity,
    imageUrl: mediaUrl(b.image_path),
    isAcceptingOrders: b.is_accepting_orders,
  }));
}

export async function getMenu(locale: Locale): Promise<MenuView> {
  const [rows, brand] = await Promise.all([getPublicRows(), getBrand()]);

  const valuesByOption = Map.groupBy(rows.values, (v) => v.option_id);
  const optionsByItem = Map.groupBy(rows.options, (o) => o.menu_item_id);
  const categorySlugs = new Map(rows.categories.map((c) => [c.id, c.slug]));

  const items: MenuItemView[] = rows.items
    .filter((item) => brand.features.alcohol || !item.is_alcohol)
    .filter((item) => categorySlugs.has(item.category_id))
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      categoryId: item.category_id,
      categorySlug: categorySlugs.get(item.category_id)!,
      name: localize(item.name_i18n, locale),
      description: localize(item.description_i18n, locale),
      basePriceCents: item.base_price_cents,
      imageUrl: mediaUrl(item.image_path),
      dietaryTags: item.dietary_tags,
      spiceSelectable: item.spice_selectable,
      isAlcohol: item.is_alcohol,
      isSignature: item.is_signature,
      options: (optionsByItem.get(item.id) ?? [])
        .map((option) => ({
          id: option.id,
          name: localize(option.name_i18n, locale),
          selection: option.selection,
          isRequired: option.is_required,
          maxSelect: option.max_select,
          values: (valuesByOption.get(option.id) ?? []).map((value) => ({
            id: value.id,
            name: localize(value.name_i18n, locale),
            priceDeltaCents: value.price_delta_cents,
            isDefault: value.is_default,
          })),
        }))
        .filter((option) => option.values.length > 0),
    }));

  const itemsByCategory = Map.groupBy(items, (i) => i.categoryId);
  const categories = rows.categories
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: localize(c.name_i18n, locale),
      description: localize(c.description_i18n, locale),
      items: itemsByCategory.get(c.id) ?? [],
    }))
    .filter((c) => c.items.length > 0);

  const overrides: BranchOverrides = {};
  for (const o of rows.overrides) {
    (overrides[o.branch_id] ??= {})[o.menu_item_id] = {
      priceCents: o.price_cents,
      isAvailable: o.is_available,
    };
  }

  const today = await getTodaysHoliday(locale);
  return {
    categories,
    overrides,
    alcoholEnabled: brand.features.alcohol,
    alcoholFreeToday: today?.isAlcoholFree ? today : null,
  };
}

export async function getSignatureItems(locale: Locale, limit = 6): Promise<MenuItemView[]> {
  const menu = await getMenu(locale);
  const signatures = menu.categories
    .flatMap((c) => c.items)
    .filter((i) => i.isSignature && !i.isAlcohol);
  // Dishes with a photo first; the sort is stable, so menu order is kept within each group.
  return signatures.sort((a, b) => Number(!a.imageUrl) - Number(!b.imageUrl)).slice(0, limit);
}

export type PromotionView = {
  id: string;
  slug: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export async function getPromotions(locale: Locale): Promise<PromotionView[]> {
  const { promotions } = await getPublicRows();
  return promotions.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: localize(p.title_i18n, locale),
    body: localize(p.body_i18n, locale),
    imageUrl: mediaUrl(p.image_path),
    ctaLabel: p.cta_label_i18n ? localize(p.cta_label_i18n, locale) : null,
    ctaHref: p.cta_href,
  }));
}

export type ReviewView = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  branchName: string | null;
  createdAt: string;
};

export async function getReviews(locale: Locale): Promise<ReviewView[]> {
  const { reviews, branches } = await getPublicRows();
  const branchNames = new Map(branches.map((b) => [b.id, localize(b.name_i18n, locale)]));
  return reviews.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    body: r.body,
    branchName: r.branch_id ? (branchNames.get(r.branch_id) ?? null) : null,
    createdAt: r.created_at,
  }));
}

export async function getTodaysHoliday(
  locale: Locale,
  now = new Date(),
): Promise<HolidayView | null> {
  const { holidays } = await getPublicRows();
  const today = todayInColombo(now);
  const match = holidays.filter((h) => h.date === today);
  // A Poya day wins over a festival on the same date (it changes what we serve).
  const holiday = match.find((h) => h.is_alcohol_free) ?? match[0];
  if (!holiday) return null;
  return {
    date: holiday.date,
    kind: holiday.kind,
    name: localize(holiday.name_i18n, locale),
    isAlcoholFree: holiday.is_alcohol_free,
  };
}
