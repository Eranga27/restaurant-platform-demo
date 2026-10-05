import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { BranchEditor } from "@/components/admin/branch-editor";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { getAdminBranch } from "@/lib/admin/branches";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getDistricts } from "@/lib/data/places";
import { mediaUrl } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit branch" };

export default async function AdminBranchPage({ params }: PageProps<"/admin/branches/[id]">) {
  const { id } = await params;
  const staff = await requireAdminPage(`/admin/branches/${id}`);
  if (!staff) return <NoAccess reason="not-admin" />;

  const [brand, districts, existing] = await Promise.all([
    getBrand(),
    getDistricts(),
    id === "new" ? Promise.resolve(null) : getAdminBranch(id),
  ]);
  if (id !== "new" && !existing) notFound();

  return (
    <AdminShell
      staff={staff}
      brandName={brand.name}
      current="branches"
      title={existing ? existing.branch.name_i18n.en : "New branch"}
      actions={
        <Link
          href="/admin/branches"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All branches
        </Link>
      }
    >
      <BranchEditor
        branch={existing?.branch ?? null}
        telegramChatId={existing?.telegramChatId ?? null}
        imageUrl={existing ? mediaUrl(existing.branch.image_path) : null}
        districts={districts.map((d) => d.name)}
        defaultFees={brand.charges.delivery}
      />
    </AdminShell>
  );
}
