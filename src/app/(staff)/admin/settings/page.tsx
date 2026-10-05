import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const staff = await requireAdminPage("/admin/settings");
  if (!staff) return <NoAccess reason="not-admin" />;
  const brand = await getBrand();

  return (
    <AdminShell staff={staff} brandName={brand.name} current="settings" title="Settings">
      <SettingsForm brand={brand} />
    </AdminShell>
  );
}
