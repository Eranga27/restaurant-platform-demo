import "server-only";

import { z } from "zod";

import type { Locale } from "@/i18n/routing";
import type { CartLine } from "@/lib/cart/store";
import { localize } from "@/lib/data/catalogue";
import { getPublicRows } from "@/lib/data/source";
import { mediaUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

/**
 * Turns one of the signed-in customer's past orders back into cart lines,
 * using today's menu: dishes no longer offered are skipped, choices are
 * matched by ID (or by name for orders placed before IDs were stored), and
 * prices are today's. Checkout re-prices everything on the server anyway.
 */

const i18n = z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() });

const orderRow = z.object({
  branch_id: z.uuid(),
  type: z.enum(["delivery", "pickup"]),
  order_items: z.array(
    z.object({
      menu_item_id: z.uuid().nullable(),
      quantity: z.number().int(),
      spice_level: z.enum(["mild", "medium", "hot"]).nullable(),
      instructions: z.string().nullable(),
      options: z.array(
        z.object({
          optionId: z.uuid().optional(),
          valueId: z.uuid().optional(),
          option: i18n,
          value: i18n,
        }),
      ),
    }),
  ),
});

export type ReorderResult =
  | {
      ok: true;
      branchId: string;
      type: "delivery" | "pickup";
      lines: Omit<CartLine, "key">[];
      skipped: number;
    }
  | { ok: false };

export async function buildReorder(orderId: string, locale: Locale): Promise<ReorderResult> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false };
  const supabase = await createClient();
  // RLS: only the customer's own orders are visible.
  const { data, error } = await supabase
    .from("orders")
    .select(
      "branch_id, type, order_items (menu_item_id, quantity, spice_level, instructions, options)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return { ok: false };
  const order = orderRow.parse(data);
  const rows = await getPublicRows();

  const lines: Omit<CartLine, "key">[] = [];
  let skipped = 0;
  for (const item of order.order_items) {
    const menuItem = rows.items.find((m) => m.id === item.menu_item_id);
    const override = rows.overrides.find(
      (o) => o.branch_id === order.branch_id && o.menu_item_id === item.menu_item_id,
    );
    if (!menuItem || override?.is_available === false) {
      skipped += 1;
      continue;
    }
    const options = rows.options.filter((o) => o.menu_item_id === menuItem.id);
    const selection: Record<string, string[]> = {};
    const details: string[] = [];
    let unit = override?.price_cents ?? menuItem.base_price_cents;
    for (const chosen of item.options) {
      const option =
        options.find((o) => o.id === chosen.optionId) ??
        options.find((o) => localize(o.name_i18n, "en") === chosen.option.en);
      const value = option
        ? rows.values.find(
            (v) =>
              v.option_id === option.id &&
              (v.id === chosen.valueId || localize(v.name_i18n, "en") === chosen.value.en),
          )
        : undefined;
      if (!option || !value) continue; // a choice that's gone: the dish's defaults apply
      (selection[option.id] ??= []).push(value.id);
      details.push(localize(value.name_i18n, locale));
      unit += value.price_delta_cents;
    }
    lines.push({
      menuItemId: menuItem.id,
      slug: menuItem.slug,
      name: localize(menuItem.name_i18n, locale),
      imageUrl: mediaUrl(menuItem.image_path),
      selection,
      details,
      spiceLevel: menuItem.spice_selectable ? item.spice_level : null,
      instructions: item.instructions,
      quantity: Math.min(item.quantity, 20),
      unitPriceCents: unit,
    });
  }
  return { ok: true, branchId: order.branch_id, type: order.type, lines, skipped };
}
