"use server";

import { z } from "zod";

import { addressInput, saveAddress } from "@/lib/account/addresses";
import { buildReorder, type ReorderResult } from "@/lib/account/reorder";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * Account actions, as the signed-in customer: RLS (and the profiles table's
 * column grants) limit each one to the customer's own data.
 */

type Result =
  { ok: true } | { ok: false; error: "not-signed-in" | "invalid" | "too-many" | "unknown" };

const profileInput = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const e164 = normalizeSriLankanPhone(v);
      if (!e164) {
        ctx.addIssue({ code: "custom", message: "phone" });
        return z.NEVER;
      }
      return e164;
    }),
});

export async function updateProfileAction(input: unknown): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not-signed-in" };
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.name, phone: parsed.data.phone })
    .eq("id", user.id);
  return error ? { ok: false, error: "unknown" } : { ok: true };
}

export async function addAddressAction(input: unknown): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not-signed-in" };
  const parsed = addressInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    await saveAddress(parsed.data);
    return { ok: true };
  } catch (error) {
    if (String(error).includes("too_many_addresses")) return { ok: false, error: "too-many" };
    return { ok: false, error: "unknown" };
  }
}

export async function deleteAddressAction(id: unknown): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not-signed-in" };
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", parsed.data);
  return error ? { ok: false, error: "unknown" } : { ok: true };
}

export async function reorderAction(orderId: unknown, lang: unknown): Promise<ReorderResult> {
  const user = await getCurrentUser();
  const locale = z.enum(["en", "si", "ta"]).safeParse(lang);
  if (!user || !locale.success) return { ok: false };
  const limit = await rateLimit("quote", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false };
  return buildReorder(String(orderId), locale.data);
}
