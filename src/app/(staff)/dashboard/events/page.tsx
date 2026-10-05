import type { Metadata } from "next";

import { DashboardShell, NoAccess } from "@/components/dashboard/dashboard-shell";
import { InquiryList } from "@/components/dashboard/inquiry-list";
import { requireStaffPage } from "@/lib/auth/staff";
import { getBranchInquiries, pickBranch } from "@/lib/dashboard/data";
import { getBrand } from "@/lib/data/brand";
import { localize } from "@/lib/data/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Events" };

export default async function EventsDashboardPage({
  searchParams,
}: PageProps<"/dashboard/events">) {
  const staff = await requireStaffPage("/dashboard/events");
  if (!staff) return <NoAccess reason="not-staff" />;
  const { branch, branches } = await pickBranch(staff, (await searchParams).branch);
  if (!branch) return <NoAccess reason="no-branch" />;

  const [inquiries, brand] = await Promise.all([getBranchInquiries(branch.id), getBrand()]);

  return (
    <DashboardShell
      staff={staff}
      brandName={brand.name}
      branch={branch}
      branches={branches}
      current="events"
    >
      <InquiryList
        inquiries={inquiries}
        canManage={staff.role !== "staff"}
        defaultDepositBps={brand.events.defaultDepositBps}
        packages={Object.fromEntries(
          brand.events.packages.map((p) => [p.id, localize(p.name, "en")]),
        )}
      />
    </DashboardShell>
  );
}
