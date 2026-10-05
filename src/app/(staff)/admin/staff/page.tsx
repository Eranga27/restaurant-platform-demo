import type { Metadata } from "next";

import { AdminShell, Panel } from "@/components/admin/admin-shell";
import { StaffManager } from "@/components/admin/staff-manager";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { getStaffList } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff" };

export default async function AdminStaffPage() {
  const staff = await requireAdminPage("/admin/staff");
  if (!staff) return <NoAccess reason="not-admin" />;
  const [members, branches, brand] = await Promise.all([
    getStaffList(),
    getBranches("en"),
    getBrand(),
  ]);

  return (
    <AdminShell staff={staff} brandName={brand.name} current="staff" title="Staff">
      <Panel description="Staff run one branch's dashboard. Managers also quote events, and admins manage everything. Managers and admins must use two-step sign-in.">
        <StaffManager
          me={staff.userId}
          members={members}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        />
      </Panel>
    </AdminShell>
  );
}
