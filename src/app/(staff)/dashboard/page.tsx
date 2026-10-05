import type { Metadata } from "next";

import { DashboardShell, NoAccess } from "@/components/dashboard/dashboard-shell";
import { OrderBoard } from "@/components/dashboard/order-board";
import { requireStaffPage } from "@/lib/auth/staff";
import { getBoardOrders, getBoardTopic, pickBranch } from "@/lib/dashboard/data";
import { getBrand } from "@/lib/data/brand";

// Live data, the signed-in user and a per-request nonce: always dynamic.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Orders" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const staff = await requireStaffPage("/dashboard");
  if (!staff) return <NoAccess reason="not-staff" />;
  const { branch, branches } = await pickBranch(staff, (await searchParams).branch);
  if (!branch) return <NoAccess reason="no-branch" />;

  const [orders, topic, brand] = await Promise.all([
    getBoardOrders(branch.id),
    getBoardTopic(branch.id),
    getBrand(),
  ]);

  return (
    <DashboardShell
      staff={staff}
      brandName={brand.name}
      branch={branch}
      branches={branches}
      current="orders"
    >
      <OrderBoard
        orders={orders}
        topic={topic}
        autoRejectMinutes={brand.orders.autoRejectMinutes}
      />
    </DashboardShell>
  );
}
