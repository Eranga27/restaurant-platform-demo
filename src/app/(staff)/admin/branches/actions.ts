"use server";

import { z } from "zod";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { deleteImage, uploadImage } from "@/lib/admin/images";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { refreshPublicSite } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditedClient } from "@/lib/supabase/server";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const NOT_ALLOWED: Result = { ok: false, error: "You don't have permission to do that." };

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const e164 = normalizeSriLankanPhone(v);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return e164;
  });
const optionalPhone = z.union([z.literal(""), phone]).transform((v) => (v === "" ? null : v));
const cents = z.number().int().min(0).max(100_000_000);

const branchInput = z.object({
  id: z.uuid().nullable(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(60),
  name: z.object({
    en: z.string().trim().min(1).max(80),
    si: z.string().trim().max(80),
    ta: z.string().trim().max(80),
  }),
  addressLine: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(40),
  lat: z.number().min(5.8).max(10),
  lng: z.number().min(79.5).max(82),
  phone,
  whatsapp: optionalPhone,
  email: z.union([z.literal(""), z.email().max(254)]).transform((v) => (v === "" ? null : v)),
  deliveryRadiusKm: z.number().min(0).max(50),
  fees: z.object({
    baseFeeCents: cents,
    includedKm: z.number().min(0).max(50),
    perKmCents: cents,
    freeAboveCents: cents.nullable(),
  }),
  hours: z.record(z.enum(DAYS), z.array(z.tuple([time, time])).max(3)),
  seatingCapacity: z.number().int().min(0).max(2000),
  isAcceptingOrders: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
  telegramChatId: z
    .string()
    .trim()
    .regex(/^(-?[0-9]{5,20})?$/),
});

export async function saveBranchAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = branchInput.safeParse(input);
  if (!parsed.success) {
    const phoneIssue = parsed.error.issues.some((i) => i.message === "phone");
    return {
      ok: false,
      error: phoneIssue
        ? "Enter Sri Lankan phone numbers, like 011 234 5678."
        : "Please check the form.",
    };
  }
  const v = parsed.data;
  const row = {
    slug: v.slug,
    name_i18n: Object.fromEntries(Object.entries(v.name).filter(([, t]) => t.length > 0)),
    address_line: v.addressLine,
    city: v.city,
    district: v.district,
    lat: v.lat,
    lng: v.lng,
    phone: v.phone,
    whatsapp: v.whatsapp,
    email: v.email,
    delivery_radius_km: v.deliveryRadiusKm,
    delivery_fee_rules: v.fees,
    opening_hours: Object.fromEntries(DAYS.map((d) => [d, v.hours[d] ?? []])),
    seating_capacity: v.seatingCapacity,
    is_accepting_orders: v.isAcceptingOrders,
    is_active: v.isActive,
    sort_order: v.sortOrder,
  };
  const supabase = await createAuditedClient();
  const { data, error } = v.id
    ? await supabase.from("branches").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("branches").insert(row).select("id").single();
  if (error || !data) return adminError(error?.message);
  const id = (data as { id: string }).id;

  // branch_secrets has no API access; the admin check above gates this write.
  const { error: secretError } = await createAdminClient()
    .from("branch_secrets")
    .update({ telegram_chat_id: v.telegramChatId || null })
    .eq("branch_id", id);
  if (secretError) return adminError(secretError.message);

  refreshPublicSite();
  return { ok: true, id };
}

export async function uploadBranchImageAction(form: FormData): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const id = z.uuid().safeParse(form.get("branchId"));
  if (!id.success) return { ok: false, error: "Please check the form." };
  const supabase = await createAuditedClient();
  const { data: current } = await supabase
    .from("branches")
    .select("image_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!current) return { ok: false, error: "Branch not found." };
  const upload = await uploadImage("branches", form.get("image"));
  if (!upload.ok) return upload;
  const { error } = await supabase
    .from("branches")
    .update({ image_path: upload.path })
    .eq("id", id.data);
  if (error) {
    await deleteImage(upload.path);
    return adminError(error.message);
  }
  await deleteImage((current as { image_path: string | null }).image_path);
  refreshPublicSite();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Holidays (Poya days and public holidays)
// ---------------------------------------------------------------------------

const holidayInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["poya", "public", "festival"]),
  name: z.object({
    en: z.string().trim().min(1).max(80),
    si: z.string().trim().max(80),
    ta: z.string().trim().max(80),
  }),
  isAlcoholFree: z.boolean(),
});

export async function addHolidayAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = holidayInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  const v = parsed.data;
  const supabase = await createAuditedClient();
  const { error } = await supabase.from("holidays").insert({
    date: v.date,
    kind: v.kind,
    name_i18n: Object.fromEntries(Object.entries(v.name).filter(([, t]) => t.length > 0)),
    is_alcohol_free: v.isAlcoholFree,
  });
  if (error) return adminError(error.message);
  refreshPublicSite();
  return { ok: true };
}

export async function deleteHolidayAction(id: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  const supabase = await createAuditedClient();
  const { error } = await supabase.from("holidays").delete().eq("id", parsed.data);
  if (error) return adminError(error.message);
  refreshPublicSite();
  return { ok: true };
}
