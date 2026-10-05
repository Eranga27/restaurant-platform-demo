"use server";

import { z } from "zod";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { createAuditedClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const cents = z.number().int().min(1).max(100_000_000);

const promoInput = z
  .object({
    id: z.uuid().nullable(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/),
    description: z.string().trim().max(200),
    kind: z.enum(["percent", "fixed"]),
    percentBps: z.number().int().min(1).max(10_000).nullable(),
    amountCents: cents.nullable(),
    minSubtotalCents: z.number().int().min(0).max(100_000_000),
    maxDiscountCents: cents.nullable(),
    startsAt: z.iso.datetime({ offset: true }).nullable(),
    endsAt: z.iso.datetime({ offset: true }).nullable(),
    maxRedemptions: z.number().int().min(1).max(1_000_000).nullable(),
    isActive: z.boolean(),
  })
  .refine((v) => (v.kind === "percent" ? v.percentBps !== null : v.amountCents !== null))
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt < v.endsAt);

export async function savePromoCodeAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return { ok: false, error: "You don't have permission to do that." };
  const parsed = promoInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  const v = parsed.data;
  const row = {
    code: v.code,
    description_i18n: v.description ? { en: v.description } : {},
    kind: v.kind,
    percent_bps: v.kind === "percent" ? v.percentBps : null,
    amount_cents: v.kind === "fixed" ? v.amountCents : null,
    min_subtotal_cents: v.minSubtotalCents,
    max_discount_cents: v.kind === "percent" ? v.maxDiscountCents : null,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    max_redemptions: v.maxRedemptions,
    is_active: v.isActive,
  };
  const supabase = await createAuditedClient();
  const { error } = v.id
    ? await supabase.from("promo_codes").update(row).eq("id", v.id)
    : await supabase.from("promo_codes").insert(row);
  return error ? adminError(error.message) : { ok: true };
}
