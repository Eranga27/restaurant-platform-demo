import type { Metadata } from "next";
import { z } from "zod";

import { AdminShell } from "@/components/admin/admin-shell";
import { FilterBar, FilterSelect } from "@/components/admin/filters";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { param } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reviews" };

const reviewRow = z.object({
  id: z.uuid(),
  branch_id: z.uuid().nullable(),
  author_name: z.string(),
  rating: z.number().int(),
  body: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  created_at: z.string(),
  order_id: z.uuid().nullable(),
});

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const query = await searchParams;
  const staff = await requireAdminPage("/admin/reviews");
  if (!staff) return <NoAccess reason="not-admin" />;
  const status =
    (["pending", "approved", "rejected"] as const).find((s) => s === param(query.status)) ??
    "pending";
  const supabase = await createClient();
  const [{ data, error }, branches, brand] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, branch_id, author_name, rating, body, status, created_at, order_id")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100),
    getBranches("en"),
    getBrand(),
  ]);
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  const reviews = z.array(reviewRow).parse(data ?? []);

  return (
    <AdminShell staff={staff} brandName={brand.name} current="reviews" title="Reviews">
      <FilterBar>
        <FilterSelect
          label="Show"
          name="status"
          defaultValue={status}
          options={[
            { value: "pending", label: "Waiting for approval" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </FilterBar>
      <ReviewModeration
        reviews={reviews.map((r) => ({
          ...r,
          branch: branches.find((b) => b.id === r.branch_id)?.name ?? "",
        }))}
      />
    </AdminShell>
  );
}
