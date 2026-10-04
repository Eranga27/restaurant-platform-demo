import type { Metadata } from "next";

import { AvailabilityList } from "@/components/dashboard/availability-list";
import { DashboardShell, NoAccess } from "@/components/dashboard/dashboard-shell";
import { requireStaffPage } from "@/lib/auth/staff";
import { getBranchAvailability, pickBranch } from "@/lib/dashboard/data";
import { getBrand } from "@/lib/data/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Menu availability" };

export default async function MenuAvailabilityPage({ searchParams }: PageProps<"/dashboard/menu">) {
  const staff = await requireStaffPage("/dashboard/menu");
  if (!staff) return <NoAccess reason="not-staff" />;
  const { branch, branches } = await pickBranch(staff, (await searchParams).branch);
  if (!branch) return <NoAccess reason="no-branch" />;

  const [menu, brand] = await Promise.all([getBranchAvailability(branch.id), getBrand()]);

  return (
    <DashboardShell
      staff={staff}
      brandName={brand.name}
      branch={branch}
      branches={branches}
      current="menu"
    >
      <div className="mx-auto max-w-3xl space-y-2">
        <p className="text-muted-foreground">
          Switch a dish off when it runs out. Customers see it as sold out at {branch.name} straight
          away, and checkout won&apos;t accept it.
        </p>
        <AvailabilityList branchId={branch.id} menu={menu} />
      </div>
    </DashboardShell>
  );
}
