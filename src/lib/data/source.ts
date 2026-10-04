import "server-only";

import { cache } from "react";
import { z } from "zod";

import * as seed from "@/data/seed";
import { createPublicClient } from "@/lib/supabase/public";

import {
  branchMenuOverrideRow,
  branchRow,
  categoryRow,
  holidayRow,
  itemOptionRow,
  itemOptionValueRow,
  menuItemRow,
  promotionRow,
  reviewRow,
} from "./rows";

/**
 * Raw public rows, from Supabase when configured, otherwise from the seed data
 * (docs/DECISIONS.md D9). Both paths go through the same Zod schemas.
 *
 * Supabase RLS already filters inactive rows, ended promotions and unapproved
 * reviews; the fallback applies the same filters here.
 */
export const getPublicRows = cache(async () => {
  const supabase = createPublicClient();
  return supabase ? fromSupabase(supabase) : fromSeed();
});

export type PublicRows = Awaited<ReturnType<typeof getPublicRows>>;

function parse<T extends z.ZodType>(schema: T, rows: unknown[], table: string): z.infer<T>[] {
  const result = z.array(schema).safeParse(rows);
  if (!result.success) {
    throw new Error(`Unexpected ${table} rows: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

async function fromSupabase(supabase: NonNullable<ReturnType<typeof createPublicClient>>) {
  const select = async (table: string, columns = "*", order = "sort_order") => {
    let query = supabase.from(table).select(columns);
    if (order) query = query.order(order);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    return (data ?? []) as unknown[];
  };

  const [
    branches,
    categories,
    items,
    options,
    values,
    overrides,
    promotions,
    holidays,
    reviews,
    settings,
  ] = await Promise.all([
    select("branches"),
    select("categories"),
    select("menu_items"),
    select("item_options"),
    select("item_option_values"),
    select("branch_menu_overrides", "branch_id, menu_item_id, price_cents, is_available", ""),
    select("promotions"),
    select("holidays", "*", "date"),
    supabase
      .from("reviews")
      .select("id, branch_id, author_name, rating, body, created_at")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (error) throw new Error(`Failed to load reviews: ${error.message}`);
        return (data ?? []) as unknown[];
      }),
    supabase
      .from("settings")
      .select("brand")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw new Error(`Failed to load settings: ${error.message}`);
        return (data?.brand ?? {}) as Record<string, unknown>;
      }),
  ]);

  return {
    source: "supabase" as const,
    branches: parse(branchRow, branches, "branches"),
    categories: parse(categoryRow, categories, "categories"),
    items: parse(menuItemRow, items, "menu_items"),
    options: parse(itemOptionRow, options, "item_options"),
    values: parse(itemOptionValueRow, values, "item_option_values"),
    overrides: parse(branchMenuOverrideRow, overrides, "branch_menu_overrides"),
    promotions: parse(promotionRow, promotions, "promotions"),
    holidays: parse(holidayRow, holidays, "holidays"),
    reviews: parse(reviewRow, reviews, "reviews"),
    brandOverrides: settings,
  };
}

function fromSeed() {
  const today = todayInColombo();
  const bySort = <T extends { sort_order: number }>(rows: T[]) =>
    [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const activeItemIds = new Set(seed.menuItems.filter((i) => i.is_active).map((i) => i.id));

  return {
    source: "seed" as const,
    branches: parse(branchRow, bySort(seed.branches.filter((b) => b.is_active)), "branches"),
    categories: parse(
      categoryRow,
      bySort(seed.categories.filter((c) => c.is_active)),
      "categories",
    ),
    items: parse(menuItemRow, bySort(seed.menuItems.filter((i) => i.is_active)), "menu_items"),
    options: parse(
      itemOptionRow,
      bySort(seed.itemOptions.filter((o) => activeItemIds.has(o.menu_item_id))),
      "item_options",
    ),
    values: parse(
      itemOptionValueRow,
      bySort(seed.itemOptionValues.filter((v) => v.is_active)),
      "item_option_values",
    ),
    overrides: parse(branchMenuOverrideRow, seed.branchMenuOverrides, "branch_menu_overrides"),
    promotions: parse(
      promotionRow,
      bySort(
        seed.promotions.filter(
          (p) =>
            p.is_active &&
            (p.starts_on === null || p.starts_on <= today) &&
            (p.ends_on === null || p.ends_on >= today),
        ),
      ),
      "promotions",
    ),
    holidays: parse(
      holidayRow,
      [...seed.holidays].sort((a, b) => a.date.localeCompare(b.date)),
      "holidays",
    ),
    reviews: parse(
      reviewRow,
      seed.reviews
        .filter((r) => r.status === "approved")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 12),
      "reviews",
    ),
    brandOverrides: {} as Record<string, unknown>,
  };
}

/** Today's date (YYYY-MM-DD) in Sri Lanka. */
export function todayInColombo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(now);
}
