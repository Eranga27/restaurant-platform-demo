import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { MenuItemEditor } from "@/components/admin/menu-item-editor";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { getAdminCategories, getAdminMenuItem } from "@/lib/admin/menu";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { mediaUrl } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit dish" };

export default async function AdminMenuItemPage({ params }: PageProps<"/admin/menu/[id]">) {
  const { id } = await params;
  const staff = await requireAdminPage(`/admin/menu/${id}`);
  if (!staff) return <NoAccess reason="not-admin" />;

  const [categories, branches, brand, existing] = await Promise.all([
    getAdminCategories(),
    getBranches("en"),
    getBrand(),
    id === "new" ? Promise.resolve(null) : getAdminMenuItem(id),
  ]);
  if (id !== "new" && !existing) notFound();

  return (
    <AdminShell
      staff={staff}
      brandName={brand.name}
      current="menu"
      title={existing ? existing.item.name_i18n.en : "New dish"}
      actions={
        <Link href="/admin/menu" className="text-sm text-muted-foreground hover:text-foreground">
          ← All dishes
        </Link>
      }
    >
      <MenuItemEditor
        categories={categories.map((c) => ({ id: c.id, name: c.name_i18n.en }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        item={existing?.item ?? null}
        imageUrl={existing ? mediaUrl(existing.item.image_path) : null}
        options={existing?.options ?? []}
        overrides={existing?.overrides ?? []}
      />
    </AdminShell>
  );
}
