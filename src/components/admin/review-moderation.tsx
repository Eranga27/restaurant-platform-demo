"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { moderateReviewAction } from "@/app/(staff)/admin/reviews/actions";
import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  order_id: string | null;
  branch: string;
};

/** Approve or reject reviews. Only approved ones are shown on the site. */
export function ReviewModeration({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    const result = await moderateReviewAction({ reviewId: id, decision }).catch(() => ({
      ok: false as const,
      error: "Something went wrong.",
    }));
    setBusy(null);
    if (!result.ok) return toast.error(result.error);
    toast.success(decision === "approved" ? "Approved: it's on the site." : "Rejected.");
    router.refresh();
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        No reviews here.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="space-y-2 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex" aria-label={`${r.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  aria-hidden
                  className={
                    n <= r.rating
                      ? "size-4 fill-highlight text-highlight"
                      : "size-4 text-muted-foreground"
                  }
                />
              ))}
            </span>
            <span className="font-semibold">{r.author_name}</span>
            <span className="text-sm text-muted-foreground">
              {r.branch} ·{" "}
              {new Intl.DateTimeFormat("en-LK", {
                dateStyle: "medium",
                timeZone: "Asia/Colombo",
              }).format(new Date(r.created_at))}
              {r.order_id ? " · from an order" : ""}
            </span>
          </div>
          <p className="whitespace-pre-line">{r.body}</p>
          <div className="flex gap-2">
            {r.status !== "approved" && (
              <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "approved")}>
                Approve
              </Button>
            )}
            {r.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={busy === r.id}
                onClick={() => decide(r.id, "rejected")}
              >
                Reject
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
