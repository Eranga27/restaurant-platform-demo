import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminBranches } from "@/lib/admin/branches";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Branches" };

export default async function AdminBranchesPage() {
  const staff = await requireAdminPage("/admin/branches");
  if (!staff) return <NoAccess reason="not-admin" />;
  const [branches, brand] = await Promise.all([getAdminBranches(), getBrand()]);

  return (
    <AdminShell
      staff={staff}
      brandName={brand.name}
      current="branches"
      title="Branches"
      actions={
        <Button asChild size="sm">
          <Link href="/admin/branches/new">
            <Plus data-icon="inline-start" aria-hidden />
            New branch
          </Link>
        </Button>
      }
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => (
          <li key={b.id} className="space-y-2 rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/admin/branches/${b.id}`}
                className="font-display text-lg text-primary hover:underline"
              >
                {b.name_i18n.en}
              </Link>
              <div className="flex gap-1">
                {!b.is_active && <Badge variant="outline">Hidden</Badge>}
                <Badge variant={b.is_accepting_orders ? "secondary" : "outline"}>
                  {b.is_accepting_orders ? "Taking orders" : "Paused"}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {b.address_line}, {b.city} · {formatPhone(b.phone)}
            </p>
            <p className="text-sm">
              Delivers {b.delivery_radius_km} km · {b.seating_capacity} seats
            </p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
