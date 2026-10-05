import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/** The whole catalogue for admins, inactive rows included (RLS: is_admin()). */

const i18n = z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() });
const optionalI18n = z.object({
  en: z.string().optional(),
  si: z.string().optional(),
  ta: z.string().optional(),
});

const categoryRow = z.object({
  id: z.uuid(),
  slug: z.string(),
  name_i18n: i18n,
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

const itemRow = z.object({
  id: z.uuid(),
  category_id: z.uuid(),
  slug: z.string(),
  name_i18n: i18n,
  description_i18n: optionalI18n,
  base_price_cents: z.number().int(),
  image_path: z.string().nullable(),
  dietary_tags: z.array(z.string()),
  spice_selectable: z.boolean(),
  is_alcohol: z.boolean(),
  is_signature: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

const valueRow = z.object({
  id: z.uuid(),
  option_id: z.uuid(),
  name_i18n: i18n,
  price_delta_cents: z.number().int(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

const optionRow = z.object({
  id: z.uuid(),
  menu_item_id: z.uuid(),
  name_i18n: i18n,
  selection: z.enum(["single", "multiple"]),
  is_required: z.boolean(),
  max_select: z.number().int().nullable(),
  sort_order: z.number().int(),
  item_option_values: z.array(valueRow),
});

const overrideRow = z.object({
  branch_id: z.uuid(),
  menu_item_id: z.uuid(),
  price_cents: z.number().int().nullable(),
  is_available: z.boolean(),
});

export type AdminCategory = z.infer<typeof categoryRow>;
export type AdminMenuItem = z.infer<typeof itemRow>;
export type AdminOption = Omit<z.infer<typeof optionRow>, "item_option_values"> & {
  values: z.infer<typeof valueRow>[];
};
export type AdminOverride = z.infer<typeof overrideRow>;

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_i18n, sort_order, is_active")
    .order("sort_order");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return z.array(categoryRow).parse(data ?? []);
}

export async function getAdminMenuItems(): Promise<AdminMenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(
      "id, category_id, slug, name_i18n, description_i18n, base_price_cents, image_path, dietary_tags, spice_selectable, is_alcohol, is_signature, is_active, sort_order",
    )
    .order("sort_order");
  if (error) throw new Error(`Failed to load dishes: ${error.message}`);
  return z.array(itemRow).parse(data ?? []);
}

/** One dish with its option groups and per-branch overrides, or null. */
export async function getAdminMenuItem(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const [item, options, overrides] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        "id, category_id, slug, name_i18n, description_i18n, base_price_cents, image_path, dietary_tags, spice_selectable, is_alcohol, is_signature, is_active, sort_order",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("item_options")
      .select(
        "id, menu_item_id, name_i18n, selection, is_required, max_select, sort_order, item_option_values (id, option_id, name_i18n, price_delta_cents, is_default, is_active, sort_order)",
      )
      .eq("menu_item_id", id)
      .order("sort_order"),
    supabase
      .from("branch_menu_overrides")
      .select("branch_id, menu_item_id, price_cents, is_available")
      .eq("menu_item_id", id),
  ]);
  if (item.error || options.error || overrides.error) throw new Error("Failed to load the dish");
  if (!item.data) return null;
  return {
    item: itemRow.parse(item.data),
    options: z
      .array(optionRow)
      .parse(options.data ?? [])
      .map(({ item_option_values, ...option }) => ({
        ...option,
        values: [...item_option_values].sort((a, b) => a.sort_order - b.sort_order),
      })),
    overrides: z.array(overrideRow).parse(overrides.data ?? []),
  };
}
