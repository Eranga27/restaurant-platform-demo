import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Branches for admins, inactive ones included (RLS: is_admin()). */

const hours = z.record(z.string(), z.array(z.tuple([z.string(), z.string()])));

const branchRow = z.object({
  id: z.uuid(),
  slug: z.string(),
  name_i18n: z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() }),
  address_line: z.string(),
  city: z.string(),
  district: z.string(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  phone: z.string(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  delivery_radius_km: z.coerce.number(),
  delivery_fee_rules: z.object({
    baseFeeCents: z.number().int(),
    includedKm: z.number(),
    perKmCents: z.number().int(),
    freeAboveCents: z.number().int().nullable(),
  }),
  opening_hours: hours,
  seating_capacity: z.number().int(),
  image_path: z.string().nullable(),
  is_accepting_orders: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export type AdminBranch = z.infer<typeof branchRow>;

const COLUMNS =
  "id, slug, name_i18n, address_line, city, district, lat, lng, phone, whatsapp, email, delivery_radius_km, delivery_fee_rules, opening_hours, seating_capacity, image_path, is_accepting_orders, is_active, sort_order";

export async function getAdminBranches(): Promise<AdminBranch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select(COLUMNS).order("sort_order");
  if (error) throw new Error(`Failed to load branches: ${error.message}`);
  return z.array(branchRow).parse(data ?? []);
}

/** One branch and its Telegram chat (from branch_secrets, read with the secret key). */
export async function getAdminBranch(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load the branch: ${error.message}`);
  if (!data) return null;
  const { data: secret } = await createAdminClient()
    .from("branch_secrets")
    .select("telegram_chat_id")
    .eq("branch_id", id)
    .maybeSingle();
  return {
    branch: branchRow.parse(data),
    telegramChatId:
      (secret as { telegram_chat_id: string | null } | null)?.telegram_chat_id ?? null,
  };
}
