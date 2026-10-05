"use client";

import { Bike, MapPin, Phone, Printer, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { updateOrderStatusAction, type ActionResult } from "@/app/(staff)/dashboard/actions";
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
import type { BoardOrder } from "@/lib/dashboard/data";
import { formatLKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { ACTION_ERRORS as ERRORS } from "./errors";

type NextStatus = "accepted" | "preparing" | "ready" | "out_for_delivery" | "completed";

const REJECT_REASONS = [
  "An item is sold out",
  "The kitchen is too busy right now",
  "We can't deliver to this address",
  "We're closing soon",
];

const SPICE = { mild: "Mild", medium: "Medium", hot: "Sri Lankan Hot" } as const;

function minutesBetween(from: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(from).getTime()) / 60_000));
}

function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function OrderCard({
  order,
  now,
  autoRejectAt,
  onChanged,
}: {
  order: BoardOrder;
  now: number;
  /** When this order will be rejected automatically, if it's still new. */
  autoRejectAt: number | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState<"rejected" | "cancelled" | null>(null);
  const [reason, setReason] = useState("");

  async function move(next: NextStatus | "rejected" | "cancelled", why: string | null = null) {
    setBusy(true);
    const result = await updateOrderStatusAction({
      orderId: order.id,
      next,
      reason: why,
    }).catch((): ActionResult => ({ ok: false, error: "unknown" }));
    setBusy(false);
    if (!result.ok) toast.error(ERRORS[result.error]);
    else setClosing(null);
    onChanged();
  }

  const delivery = order.type === "delivery";
  const forward: { next: NextStatus; label: string }[] =
    order.status === "received"
      ? [{ next: "accepted", label: "Accept" }]
      : order.status === "accepted"
        ? [
            { next: "preparing", label: "Start preparing" },
            delivery
              ? { next: "out_for_delivery", label: "Out for delivery" }
              : { next: "ready", label: "Ready for pickup" },
          ]
        : order.status === "preparing"
          ? [
              delivery
                ? { next: "out_for_delivery", label: "Out for delivery" }
                : { next: "ready", label: "Ready for pickup" },
            ]
          : order.status === "ready" || order.status === "out_for_delivery"
            ? [{ next: "completed", label: delivery ? "Delivered" : "Collected" }]
            : [];
  const canReject = order.status === "received";
  const canCancel = ["accepted", "preparing", "ready"].includes(order.status);
  const finished = ["completed", "rejected", "cancelled"].includes(order.status);
  const waited = minutesBetween(order.receivedAt, now);
  const rejectIn = autoRejectAt === null ? null : Math.ceil((autoRejectAt - now) / 60_000);

  return (
    <article
      aria-label={`Order ${order.order_number}`}
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 shadow-soft",
        order.status === "received" && "border-highlight ring-2 ring-highlight/40",
        finished && "opacity-75",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-lg font-semibold tracking-wider">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {order.scheduled_for ? `For ${clock(order.scheduled_for)}` : "As soon as possible"} ·{" "}
            {waited === 0 ? "just now" : `${waited} min ago`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="gap-1">
            {delivery ? (
              <Bike aria-hidden className="size-3" />
            ) : (
              <Store aria-hidden className="size-3" />
            )}
            {delivery ? "Delivery" : "Pickup"}
          </Badge>
          <Badge variant={order.payment_status === "paid" ? "secondary" : "outline"}>
            {order.payment_status === "paid"
              ? "Paid"
              : order.payment_method === "cod"
                ? "Cash"
                : "Unpaid"}
          </Badge>
        </div>
      </header>

      {rejectIn !== null && (
        <p role="status" className="rounded-lg bg-highlight/20 px-3 py-1.5 text-sm font-medium">
          {rejectIn > 0 ? `Auto-rejects in ${rejectIn} min` : "Auto-rejecting now…"}
        </p>
      )}

      <ul className="space-y-1.5 text-sm">
        {order.items.map((item, i) => (
          <li key={i}>
            <span className="font-semibold">{item.quantity}×</span> {item.name}
            {(item.details.length > 0 || item.spiceLevel || item.instructions) && (
              <span className="block pl-5 text-xs text-muted-foreground">
                {[
                  ...item.details,
                  item.spiceLevel ? SPICE[item.spiceLevel] : null,
                  item.instructions ? `“${item.instructions}”` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-semibold">Note:</span> {order.notes}
        </p>
      )}

      <div className="space-y-1 border-t pt-3 text-sm">
        <p className="font-medium">{order.customer_name}</p>
        <a
          href={`tel:${order.customer_phone}`}
          className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
        >
          <Phone aria-hidden className="size-3.5" />
          {formatPhone(order.customer_phone)}
        </a>
        {delivery && (
          <p className="flex gap-1.5 text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {[order.delivery_address, order.delivery_landmark, order.delivery_city]
                .filter(Boolean)
                .join(", ")}
              {order.delivery_lat !== null && order.delivery_lng !== null && (
                <>
                  {" "}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${order.delivery_lat}&mlon=${order.delivery_lng}#map=17/${order.delivery_lat}/${order.delivery_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Map
                  </a>
                </>
              )}
            </span>
          </p>
        )}
        <p className="font-semibold tabular-nums">{formatLKR(order.total_cents)}</p>
        {order.rejection_reason && finished && (
          <p className="text-xs text-muted-foreground">Reason: {order.rejection_reason}</p>
        )}
      </div>

      {!finished && (
        <div className="flex flex-wrap gap-2">
          {forward.map((step, i) => (
            <Button
              key={step.next}
              size="sm"
              variant={i === 0 ? "default" : "outline"}
              disabled={busy}
              onClick={() => move(step.next)}
            >
              {step.label}
            </Button>
          ))}
          {(canReject || canCancel) && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={busy}
              onClick={() => {
                setReason("");
                setClosing(canReject ? "rejected" : "cancelled");
              }}
            >
              {canReject ? "Reject" : "Cancel"}
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-3 text-xs">
        <a
          href={`/dashboard/orders/${order.id}/print?copy=kitchen`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Printer aria-hidden className="size-3.5" /> Kitchen ticket
        </a>
        <a
          href={`/dashboard/orders/${order.id}/print?copy=receipt`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Printer aria-hidden className="size-3.5" /> Receipt
        </a>
      </div>

      <Dialog open={closing !== null} onOpenChange={(open) => !open && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {closing === "rejected" ? "Reject" : "Cancel"} order {order.order_number}?
            </DialogTitle>
            <DialogDescription>
              The customer sees this reason on their tracking page.
              {order.payment_status === "paid" && " Their online payment will need a refund."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REJECT_REASONS.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={reason === r ? "default" : "outline"}
                onClick={() => setReason(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reason-${order.id}`}>Reason</Label>
            <Textarea
              id={`reason-${order.id}`}
              value={reason}
              maxLength={300}
              rows={2}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosing(null)}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              disabled={busy || reason.trim().length === 0}
              onClick={() => closing && move(closing, reason.trim())}
            >
              {closing === "rejected" ? "Reject order" : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
