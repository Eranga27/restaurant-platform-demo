import type { Metadata } from "next";
import { z } from "zod";

import { AdminShell, Panel } from "@/components/admin/admin-shell";
import { HolidayEditor } from "@/components/admin/holiday-editor";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { colomboToday } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Holidays" };

const holidayRow = z.object({
  id: z.uuid(),
  date: z.string(),
  kind: z.enum(["poya", "public", "festival"]),
  name_i18n: z.object({ en: z.string() }).loose(),
  is_alcohol_free: z.boolean(),
});

export default async function AdminHolidaysPage() {
  const staff = await requireAdminPage("/admin/holidays");
  if (!staff) return <NoAccess reason="not-admin" />;
  const supabase = await createClient();
  const [{ data, error }, brand] = await Promise.all([
    supabase
      .from("holidays")
      .select("id, date, kind, name_i18n, is_alcohol_free")
      .gte("date", colomboToday(-31))
      .order("date"),
    getBrand(),
  ]);
  if (error) throw new Error(`Failed to load holidays: ${error.message}`);
  const holidays = z.array(holidayRow).parse(data ?? []);

  return (
    <AdminShell staff={staff} brandName={brand.name} current="holidays" title="Holidays">
      <Panel
        title="Poya days and public holidays"
        description="Alcohol is hidden from the menu and refused at checkout on alcohol-free days. The site shows a banner on Poya days."
      >
        <HolidayEditor
          holidays={holidays.map((h) => ({
            id: h.id,
            date: h.date,
            kind: h.kind,
            name: h.name_i18n.en,
            isAlcoholFree: h.is_alcohol_free,
          }))}
        />
      </Panel>
    </AdminShell>
  );
}
