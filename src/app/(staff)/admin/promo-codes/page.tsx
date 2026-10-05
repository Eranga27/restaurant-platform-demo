import type { Metadata } from "next";
import { z } from "zod";

import { AdminShell, Panel } from "@/components/admin/admin-shell";
import { PromoCodeEditor } from "@/components/admin/promo-code-editor";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Promo codes" };

const promoRow = z.object({
  id: z.uuid(),
  code: z.string(),
  description_i18n: z.object({ en: z.string().optional() }).loose(),
  kind: z.enum(["percent", "fixed"]),
  percent_bps: z.number().int().nullable(),
  amount_cents: z.number().int().nullable(),
  min_subtotal_cents: z.number().int(),
  max_discount_cents: z.number().int().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  max_redemptions: z.number().int().nullable(),
  is_active: z.boolean(),
  promo_redemptions: z.array(z.object({ count: z.number() })),
});

export default async function AdminPromoCodesPage() {
  const staff = await requireAdminPage("/admin/promo-codes");
  if (!staff) return <NoAccess reason="not-admin" />;
  const supabase = await createClient();
  const [{ data, error }, brand] = await Promise.all([
    supabase
      .from("promo_codes")
      .select(
        "id, code, description_i18n, kind, percent_bps, amount_cents, min_subtotal_cents, max_discount_cents, starts_at, ends_at, max_redemptions, is_active, promo_redemptions (count)",
      )
      .order("created_at", { ascending: false }),
    getBrand(),
  ]);
  if (error) throw new Error(`Failed to load promo codes: ${error.message}`);
  const codes = z.array(promoRow).parse(data ?? []);

  return (
    <AdminShell staff={staff} brandName={brand.name} current="promo-codes" title="Promo codes">
      <Panel description="Discounts apply to the food total, before the service charge and VAT. A code given back by a cancelled order can be used again.">
        <PromoCodeEditor
          codes={codes.map(({ promo_redemptions, description_i18n, ...c }) => ({
            ...c,
            description: description_i18n.en ?? "",
            used: promo_redemptions[0]?.count ?? 0,
          }))}
        />
      </Panel>
    </AdminShell>
  );
}
