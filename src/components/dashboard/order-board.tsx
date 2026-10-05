"use client";

import { BellRing, BellOff, Play, Radio, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { BoardOrder } from "@/lib/dashboard/data";
import { publicEnv } from "@/lib/public-env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { playChime, unlockAudio } from "./chime";
import { OrderCard } from "./order-card";
import { currentPushSubscription, disablePush, enablePush, pushSupported } from "./push";

const COLUMNS = [
  { key: "new", title: "New", statuses: ["received"] },
  { key: "accepted", title: "Accepted", statuses: ["accepted"] },
  { key: "preparing", title: "Preparing", statuses: ["preparing"] },
  { key: "ready", title: "Ready / on the way", statuses: ["ready", "out_for_delivery"] },
  { key: "done", title: "Done today", statuses: ["completed", "rejected", "cancelled"] },
] as const;

/**
 * The live order board. Listens on the branch's secret broadcast topic and
 * reloads the orders (through RLS) whenever one changes; also re-checks on
 * connecting and every 30 seconds, since broadcasts aren't replayed (D34).
 */
export function OrderBoard({
  orders,
  topic,
  autoRejectMinutes,
}: {
  orders: BoardOrder[];
  topic: string | null;
  autoRejectMinutes: number;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [shiftStarted, setShiftStarted] = useState(false);
  // "unsupported" until checked, so the button doesn't flash on browsers without push.
  const [push, setPush] = useState<"unsupported" | "off" | "on">("unsupported");
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<string> | null>(null);

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    if (!topic || !publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) return;
    const supabase = createClient();
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: "order" }, () => refresh())
      .subscribe((state) => {
        setLive(state === "SUBSCRIBED");
        if (state === "SUBSCRIBED") refresh();
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [topic, refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      refresh();
    }, 30_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    void currentPushSubscription().then((subscription) => {
      if (cancelled || !pushSupported() || !publicEnv.vapidPublicKey) return;
      setPush(subscription ? "on" : "off");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // New orders: chime and toast for any order that wasn't on the board before.
  useEffect(() => {
    const previous = seen.current;
    seen.current = new Set(orders.map((o) => o.id));
    if (!previous) return;
    const fresh = orders.filter((o) => o.status === "received" && !previous.has(o.id));
    if (fresh.length === 0) return;
    if (shiftStarted) playChime();
    toast.info(
      fresh.length === 1 ? `New order ${fresh[0]!.order_number}` : `${fresh.length} new orders`,
    );
  }, [orders, shiftStarted]);

  const waiting = orders.filter((o) => o.status === "received");

  // Keep ringing every 20 seconds while an order is waiting to be accepted.
  const hasWaiting = waiting.length > 0;
  useEffect(() => {
    if (!shiftStarted || !hasWaiting) return;
    const timer = setInterval(playChime, 20_000);
    return () => clearInterval(timer);
  }, [shiftStarted, hasWaiting]);

  useEffect(() => {
    document.title = hasWaiting ? `(${waiting.length}) New orders` : "Orders";
  }, [hasWaiting, waiting.length]);

  async function startShift() {
    const ok = await unlockAudio();
    setShiftStarted(ok);
    if (ok) playChime();
    else toast.error("This browser blocked sound. Check the site's sound settings.");
  }

  async function togglePush() {
    if (push === "on") {
      await disablePush();
      setPush("off");
      return;
    }
    const result = await enablePush(publicEnv.vapidPublicKey!);
    if (result === "on") {
      setPush("on");
      toast.success("Alerts are on for this device.");
    } else if (result === "denied") {
      toast.error("Notifications are blocked for this site in the browser settings.");
    } else toast.error("Couldn't turn on alerts on this device.");
  }

  function autoRejectAt(order: BoardOrder): number | null {
    if (order.status !== "received" || autoRejectMinutes <= 0) return null;
    return order.scheduled_for
      ? new Date(order.scheduled_for).getTime() - 15 * 60_000
      : new Date(order.receivedAt).getTime() + autoRejectMinutes * 60_000;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            live ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          <Radio aria-hidden className={cn("size-3.5", live && "animate-pulse")} />
          {live ? "Live" : "Connecting…"}
        </span>
        {shiftStarted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <BellRing aria-hidden className="size-3.5" /> Sound on
          </span>
        ) : (
          <Button size="sm" onClick={startShift}>
            <Play data-icon="inline-start" aria-hidden />
            Start shift (turn on sound)
          </Button>
        )}
        {push !== "unsupported" && (
          <Button size="sm" variant="outline" onClick={togglePush}>
            {push === "on" ? (
              <BellOff data-icon="inline-start" aria-hidden />
            ) : (
              <Smartphone data-icon="inline-start" aria-hidden />
            )}
            {push === "on" ? "Turn off alerts on this device" : "Alerts on this device"}
          </Button>
        )}
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {COLUMNS.map((column) => {
          const items = orders.filter((o) =>
            (column.statuses as readonly string[]).includes(o.status),
          );
          const shown = column.key === "done" ? [...items].reverse() : items;
          return (
            <section
              key={column.key}
              aria-labelledby={`col-${column.key}`}
              className="w-[85vw] max-w-sm shrink-0 snap-start space-y-3 sm:w-80 lg:w-auto lg:max-w-none"
            >
              <h2
                id={`col-${column.key}`}
                className="flex items-center justify-between text-sm font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {column.title}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {items.length}
                </span>
              </h2>
              {shown.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nothing here
                </p>
              ) : (
                shown.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    autoRejectAt={autoRejectAt(order)}
                    onChanged={refresh}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
