import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AdminShell, Panel } from "@/components/admin/admin-shell";
import { CategoryEditor } from "@/components/admin/category-editor";
import { FilterBar, FilterSelect } from "@/components/admin/filters";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { param } from "@/lib/admin/data";
import { getAdminCategories, getAdminMenuItems } from "@/lib/admin/menu";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { formatLKR } from "@/lib/money";
import { mediaUrl } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Menu" };

export default async function AdminMenuPage({ searchParams }: PageProps<"/admin/menu">) {
  const query = await searchParams;
  const staff = await requireAdminPage("/admin/menu");
  if (!staff) return <NoAccess reason="not-admin" />;

  const [categories, items, brand] = await Promise.all([
    getAdminCategories(),
    getAdminMenuItems(),
    getBrand(),
  ]);
  const category = categories.find((c) => c.id === param(query.category));
  const shown = category ? items.filter((i) => i.category_id === category.id) : items;
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name_i18n.en ?? "";

  return (
    <AdminShell
      staff={staff}
      brandName={brand.name}
      current="menu"
      title="Menu"
      actions={
        <Button asChild size="sm">
          <Link href="/admin/menu/new">
            <Plus data-icon="inline-start" aria-hidden />
            New dish
          </Link>
        </Button>
      }
    >
      <FilterBar>
        <FilterSelect
          label="Category"
          name="category"
          defaultValue={category?.id}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name_i18n.en })),
          ]}
        />
      </FilterBar>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Dish</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Labels</th>
              <th className="px-4 py-2 font-medium">Shown</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => {
              const image = mediaUrl(item.image_path);
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="flex items-center gap-3 font-medium text-primary hover:underline"
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="size-10 rounded-lg bg-muted" />
                      )}
                      {item.name_i18n.en}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{categoryName(item.category_id)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatLKR(item.base_price_cents)}
                  </td>
                  <td className="space-x-1 px-4 py-2">
                    {item.is_signature && <Badge variant="highlight">Signature</Badge>}
                    {item.is_alcohol && <Badge variant="outline">Alcohol</Badge>}
                    {item.dietary_tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </td>
                  <td className="px-4 py-2">{item.is_active ? "Yes" : "Hidden"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Panel title="Categories" description="Order, names and visibility of the menu's sections.">
        <CategoryEditor categories={categories} />
      </Panel>
    </AdminShell>
  );
}
