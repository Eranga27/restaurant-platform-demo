"use client";

import { Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { updateReservationStatusAction, type ActionResult } from "@/app/(staff)/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardReservation } from "@/lib/dashboard/data";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { ACTION_ERRORS } from "./errors";

const STATUS: Record<DashboardReservation["status"], string> = {
  confirmed: "Booked",
  seated: "Seated",
  completed: "Finished",
  no_show: "No-show",
  cancelled: "Cancelled",
};
const SEATING = { any: "", indoor: "Indoors", outdoor: "Outdoors" } as const;
const OCCASION = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  business: "Business meal",
  other: "Occasion",
} as const;

const clock = (iso: string) =>
  new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

/** A day's bookings in time order, with seat / finish / no-show / cancel. Refreshes every minute. */
export function ReservationList({ bookings }: { bookings: DashboardReservation[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<DashboardReservation | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(timer);
  }, [router]);

  async function move(
    booking: DashboardReservation,
    next: "seated" | "completed" | "no_show" | "cancelled",
    why: string | null = null,
  ) {
    setBusy(booking.id);
    const result = await updateReservationStatusAction({
      reservationId: booking.id,
      next,
      reason: why,
    }).catch((): ActionResult => ({ ok: false, error: "unknown" }));
    setBusy(null);
    if (!result.ok) toast.error(ACTION_ERRORS[result.error]);
    else setCancelling(null);
    router.refresh();
  }

  if (bookings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No bookings for this day.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-2xl border bg-card shadow-soft">
        {bookings.map((b) => (
          <li
            key={b.id}
            aria-label={`Booking ${b.reference}`}
            className={cn(
              "flex flex-wrap items-start gap-x-6 gap-y-2 p-4",
              (b.status === "cancelled" || b.status === "no_show") && "opacity-60",
            )}
          >
            <div className="w-20 shrink-0">
              <p className="text-lg font-semibold tabular-nums">{clock(b.starts_at)}</p>
              <p className="text-xs text-muted-foreground">until {clock(b.ends_at)}</p>
            </div>
            <div className="min-w-48 flex-1 space-y-1">
              <p className="font-semibold">
                {b.guest_name} · {b.party_size} guest{b.party_size === 1 ? "" : "s"}
              </p>
              <a
                href={`tel:${b.guest_phone}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary"
              >
                <Phone aria-hidden className="size-3.5" />
                {formatPhone(b.guest_phone)}
              </a>
              <p className="flex flex-wrap gap-1 text-xs">
                <span className="font-mono text-muted-foreground">{b.reference}</span>
                {SEATING[b.seating] && <Badge variant="outline">{SEATING[b.seating]}</Badge>}
                {b.occasion && <Badge variant="highlight">{OCCASION[b.occasion]}</Badge>}
              </p>
              {b.notes && <p className="text-sm">“{b.notes}”</p>}
              {b.cancel_reason && (
                <p className="text-xs text-muted-foreground">Reason: {b.cancel_reason}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={b.status === "seated" ? "secondary" : "outline"}>
                {STATUS[b.status]}
              </Badge>
              {b.status === "confirmed" && (
                <>
                  <Button size="sm" disabled={busy === b.id} onClick={() => move(b, "seated")}>
                    Seated
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === b.id}
                    onClick={() => move(b, "no_show")}
                  >
                    No-show
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy === b.id}
                    onClick={() => {
                      setReason("");
                      setCancelling(b);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {b.status === "seated" && (
                <Button size="sm" disabled={busy === b.id} onClick={() => move(b, "completed")}>
                  Finished
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={cancelling !== null} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {cancelling?.guest_name}&apos;s booking?</DialogTitle>
            <DialogDescription>
              The guest is emailed and sees the reason on their booking page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={300}
              rows={2}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep booking
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelling || reason.trim().length === 0 || busy !== null}
              onClick={() => cancelling && move(cancelling, "cancelled", reason.trim())}
            >
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
