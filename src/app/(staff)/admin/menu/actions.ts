"use server";

import { z } from "zod";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { deleteImage, uploadImage } from "@/lib/admin/images";
import { refreshPublicSite } from "@/lib/revalidate";
import { createAuditedClient } from "@/lib/supabase/server";

/**
 * Menu admin actions. Each checks for an admin with MFA, validates its input,
 * then writes as that admin, so RLS (is_admin()) applies and the audit log
 * records who made the change.
 */

type Result = { ok: true; id?: string } | { ok: false; error: string };

const NOT_ALLOWED: Result = { ok: false, error: "You don't have permission to do that." };
const INVALID: Result = { ok: false, error: "Please check the form." };

const text = (max: number) => z.string().trim().max(max);
const i18nRequired = z.object({ en: text(120).min(1), si: text(120), ta: text(120) });
const i18nOptional = z.object({ en: text(600), si: text(600), ta: text(600) });
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80);
const cents = z.number().int().min(0).max(100_000_000);

/** Drops empty translations so the site falls back to English. */
function compact(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v.length > 0));
}

function refreshSite() {
  refreshPublicSite();
}

// ---------------------------------------------------------------------------
// Dishes
// ---------------------------------------------------------------------------

const itemInput = z.object({
  id: z.uuid().nullable(),
  categoryId: z.uuid(),
  slug,
  name: i18nRequired,
  description: i18nOptional,
  basePriceCents: cents,
  dietaryTags: z.array(z.enum(["vegetarian", "vegan", "halal", "contains-nuts"])).max(4),
  spiceSelectable: z.boolean(),
  isAlcohol: z.boolean(),
  isSignature: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

export async function saveMenuItemAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = itemInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const v = parsed.data;
  const row = {
    category_id: v.categoryId,
    slug: v.slug,
    name_i18n: compact(v.name),
    description_i18n: compact(v.description),
    base_price_cents: v.basePriceCents,
    dietary_tags: [...new Set(v.dietaryTags)],
    spice_selectable: v.spiceSelectable,
    is_alcohol: v.isAlcohol,
    is_signature: v.isSignature,
    is_active: v.isActive,
    sort_order: v.sortOrder,
  };
  const supabase = await createAuditedClient();
  const { data, error } = v.id
    ? await supabase.from("menu_items").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("menu_items").insert(row).select("id").single();
  if (error || !data) return adminError(error?.message);
  refreshSite();
  return { ok: true, id: (data as { id: string }).id };
}

export async function uploadMenuImageAction(form: FormData): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const id = z.uuid().safeParse(form.get("itemId"));
  if (!id.success) return INVALID;
  const supabase = await createAuditedClient();
  const { data: current } = await supabase
    .from("menu_items")
    .select("image_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!current) return INVALID;

  const upload = await uploadImage("menu", form.get("image"));
  if (!upload.ok) return upload;
  const { error } = await supabase
    .from("menu_items")
    .update({ image_path: upload.path })
    .eq("id", id.data);
  if (error) {
    await deleteImage(upload.path);
    return adminError(error.message);
  }
  await deleteImage((current as { image_path: string | null }).image_path);
  refreshSite();
  return { ok: true };
}

export async function removeMenuImageAction(itemId: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return INVALID;
  const supabase = await createAuditedClient();
  const { data: current } = await supabase
    .from("menu_items")
    .select("image_path")
    .eq("id", id.data)
    .maybeSingle();
  const { error } = await supabase
    .from("menu_items")
    .update({ image_path: null })
    .eq("id", id.data);
  if (error) return adminError(error.message);
  await deleteImage((current as { image_path: string | null } | null)?.image_path ?? null);
  refreshSite();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Per-branch prices and availability
// ---------------------------------------------------------------------------

const overridesInput = z.object({
  menuItemId: z.uuid(),
  branches: z
    .array(z.object({ branchId: z.uuid(), priceCents: cents.nullable(), isAvailable: z.boolean() }))
    .max(50),
});

export async function saveOverridesAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = overridesInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createAuditedClient();
  for (const b of parsed.data.branches) {
    // No override needed: base price and available.
    if (b.priceCents === null && b.isAvailable) {
      const { error } = await supabase
        .from("branch_menu_overrides")
        .delete()
        .eq("branch_id", b.branchId)
        .eq("menu_item_id", parsed.data.menuItemId);
      if (error) return adminError(error.message);
    } else {
      const { error } = await supabase.from("branch_menu_overrides").upsert({
        branch_id: b.branchId,
        menu_item_id: parsed.data.menuItemId,
        price_cents: b.priceCents,
        is_available: b.isAvailable,
      });
      if (error) return adminError(error.message);
    }
  }
  refreshSite();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Option groups (portion, add-ons) and their choices
// ---------------------------------------------------------------------------

const optionInput = z.object({
  id: z.uuid().nullable(),
  menuItemId: z.uuid(),
  name: i18nRequired,
  selection: z.enum(["single", "multiple"]),
  isRequired: z.boolean(),
  maxSelect: z.number().int().min(1).max(20).nullable(),
  sortOrder: z.number().int().min(0).max(1000),
});

export async function saveOptionAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = optionInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const v = parsed.data;
  const row = {
    menu_item_id: v.menuItemId,
    name_i18n: compact(v.name),
    selection: v.selection,
    is_required: v.isRequired,
    max_select: v.selection === "multiple" ? v.maxSelect : null,
    sort_order: v.sortOrder,
  };
  const supabase = await createAuditedClient();
  const { data, error } = v.id
    ? await supabase.from("item_options").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("item_options").insert(row).select("id").single();
  if (error || !data) return adminError(error?.message);
  refreshSite();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteOptionAction(id: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return INVALID;
  const supabase = await createAuditedClient();
  const { error } = await supabase.from("item_options").delete().eq("id", parsed.data);
  if (error) return adminError(error.message);
  refreshSite();
  return { ok: true };
}

const valueInput = z.object({
  id: z.uuid().nullable(),
  optionId: z.uuid(),
  name: i18nRequired,
  priceDeltaCents: z.number().int().min(-100_000_000).max(100_000_000),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export async function saveOptionValueAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = valueInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const v = parsed.data;
  const row = {
    option_id: v.optionId,
    name_i18n: compact(v.name),
    price_delta_cents: v.priceDeltaCents,
    is_default: v.isDefault,
    is_active: v.isActive,
    sort_order: v.sortOrder,
  };
  const supabase = await createAuditedClient();
  const { data, error } = v.id
    ? await supabase.from("item_option_values").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("item_option_values").insert(row).select("id").single();
  if (error || !data) return adminError(error?.message);
  refreshSite();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteOptionValueAction(id: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return INVALID;
  const supabase = await createAuditedClient();
  const { error } = await supabase.from("item_option_values").delete().eq("id", parsed.data);
  if (error) return adminError(error.message);
  refreshSite();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryInput = z.object({
  id: z.uuid().nullable(),
  slug,
  name: i18nRequired,
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export async function saveCategoryAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = categoryInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const v = parsed.data;
  const row = {
    slug: v.slug,
    name_i18n: compact(v.name),
    is_active: v.isActive,
    sort_order: v.sortOrder,
  };
  const supabase = await createAuditedClient();
  const { data, error } = v.id
    ? await supabase.from("categories").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("categories").insert(row).select("id").single();
  if (error || !data) return adminError(error?.message);
  refreshSite();
  return { ok: true, id: (data as { id: string }).id };
}
