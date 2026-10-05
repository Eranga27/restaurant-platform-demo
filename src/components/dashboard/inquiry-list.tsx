"use client";

import { Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  quoteEventAction,
  setEventStatusAction,
  type ActionResult,
} from "@/app/(staff)/dashboard/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardInquiry } from "@/lib/dashboard/data";
import { applyBasisPoints, formatLKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

import { ACTION_ERRORS } from "./errors";

const TYPES = {
  birthday: "Birthday",
  office: "Office",
  dana: "Dana",
  wedding: "Wedding",
  homecoming: "Homecoming",
  other: "Other",
} as const;

const COLUMNS = [
  { key: "new", title: "New enquiries", statuses: ["new"] },
  { key: "quoted", title: "Quoted", statuses: ["quoted"] },
  { key: "confirmed", title: "Confirmed", statuses: ["confirmed"] },
  { key: "closed", title: "Closed (last 30 days)", statuses: ["done", "declined", "cancelled"] },
] as const;

type Closing = { inquiry: DashboardInquiry; next: "declined" | "cancelled" };

/** The events pipeline: New → Quoted → Confirmed → Done. Managers and admins quote and close. */
export function InquiryList({
  inquiries,
  canManage,
  defaultDepositBps,
  packages,
}: {
  inquiries: DashboardInquiry[];
  canManage: boolean;
  defaultDepositBps: number;
  packages: Record<string, string>;
}) {
  const router = useRouter();
  const [quoting, setQuoting] = useState<DashboardInquiry | null>(null);
  const [quote, setQuote] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState<Closing | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  function openQuote(inquiry: DashboardInquiry) {
    setQuoting(inquiry);
    setQuote(inquiry.quote_cents ? String(inquiry.quote_cents / 100) : "");
    setDeposit(inquiry.deposit_cents !== null ? String(inquiry.deposit_cents / 100) : "");
    setNotes(inquiry.quote_notes ?? "");
  }

  const quoteCents = Math.round(Number(quote) * 100);
  const suggestedDeposit =
    quoteCents > 0 ? Math.round(applyBasisPoints(quoteCents, defaultDepositBps) / 100) : 0;
  const depositCents = deposit === "" ? suggestedDeposit * 100 : Math.round(Number(deposit) * 100);
  const quoteValid =
    Number.isFinite(quoteCents) &&
    quoteCents > 0 &&
    depositCents >= 0 &&
    depositCents <= quoteCents;

  async function run(action: () => Promise<ActionResult>, done: string) {
    setBusy(true);
    const result = await action().catch((): ActionResult => ({ ok: false, error: "unknown" }));
    setBusy(false);
    if (result.ok) {
      toast.success(done);
      setQuoting(null);
      setClosing(null);
    } else toast.error(ACTION_ERRORS[result.error]);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = inquiries.filter((i) =>
            (column.statuses as readonly string[]).includes(i.status),
          );
          return (
            <section
              key={column.key}
              aria-labelledby={`events-${column.key}`}
              className="space-y-3"
            >
              <h2
                id={`events-${column.key}`}
                className="flex items-center justify-between text-sm font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {column.title}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {items.length}
                </span>
              </h2>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nothing here
                </p>
              ) : (
                items.map((i) => (
                  <article
                    key={i.id}
                    aria-label={`Enquiry ${i.reference}`}
                    className="space-y-2 rounded-xl border bg-card p-4 text-sm shadow-soft"
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {TYPES[i.event_type]} · {i.guests} guests
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en-LK", {
                            dateStyle: "medium",
                            timeZone: "UTC",
                          }).format(new Date(`${i.event_date}T00:00:00Z`))}
                          {i.event_time ? ` · ${i.event_time.slice(0, 5)}` : ""} ·{" "}
                          <span className="font-mono">{i.reference}</span>
                        </p>
                      </div>
                      <Badge variant="outline">
                        {i.service === "catering" ? "Catering" : "At branch"}
                      </Badge>
                    </header>
                    {i.venue && <p>Venue: {i.venue}</p>}
                    {i.package_id && <p>Menu: {packages[i.package_id] ?? i.package_id}</p>}
                    {i.budget_cents !== null && <p>Budget: {formatLKR(i.budget_cents)}</p>}
                    {i.notes && <p className="whitespace-pre-line">“{i.notes}”</p>}
                    <div className="space-y-0.5 border-t pt-2">
                      <p className="font-medium">{i.contact_name}</p>
                      <a
                        href={`tel:${i.contact_phone}`}
                        className="flex items-center gap-1.5 text-primary"
                      >
                        <Phone aria-hidden className="size-3.5" /> {formatPhone(i.contact_phone)}
                      </a>
                      <a
                        href={`mailto:${i.contact_email}`}
                        className="flex items-center gap-1.5 text-primary"
                      >
                        <Mail aria-hidden className="size-3.5" /> {i.contact_email}
                      </a>
                    </div>
                    {i.quote_cents !== null && (
                      <p className="border-t pt-2">
                        Quote <strong>{formatLKR(i.quote_cents)}</strong>
                        {i.deposit_cents
                          ? ` · deposit ${formatLKR(i.deposit_cents)} (${
                              i.deposit_status === "paid" ? "paid" : "not paid"
                            })`
                          : " · no deposit"}
                        {i.status === "quoted" &&
                          (i.accepted_at ? " · accepted" : " · waiting for the guest")}
                      </p>
                    )}
                    {i.close_reason && (
                      <p className="text-xs text-muted-foreground">Reason: {i.close_reason}</p>
                    )}
                    {canManage && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(i.status === "new" ||
                          (i.status === "quoted" && i.deposit_status !== "paid")) && (
                          <Button size="sm" onClick={() => openQuote(i)}>
                            {i.status === "new" ? "Send quote" : "Revise quote"}
                          </Button>
                        )}
                        {i.status === "quoted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () =>
                                  setEventStatusAction({
                                    inquiryId: i.id,
                                    next: "confirmed",
                                    reason: null,
                                  }),
                                "Event confirmed. The guest has been emailed.",
                              )
                            }
                          >
                            Mark confirmed
                          </Button>
                        )}
                        {i.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () =>
                                  setEventStatusAction({
                                    inquiryId: i.id,
                                    next: "done",
                                    reason: null,
                                  }),
                                "Marked as done.",
                              )
                            }
                          >
                            Mark done
                          </Button>
                        )}
                        {(i.status === "new" ||
                          i.status === "quoted" ||
                          i.status === "confirmed") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              setReason("");
                              setClosing({
                                inquiry: i,
                                next: i.status === "confirmed" ? "cancelled" : "declined",
                              });
                            }}
                          >
                            {i.status === "confirmed" ? "Cancel" : "Decline"}
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={quoting !== null} onOpenChange={(open) => !open && setQuoting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quote for {quoting?.contact_name}</DialogTitle>
            <DialogDescription>
              {quoting && `${TYPES[quoting.event_type]} for ${quoting.guests} guests.`} The guest is
              emailed a link to accept it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote">Total (Rs.)</Label>
              <Input
                id="quote"
                inputMode="decimal"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
              {quoteCents > 0 && quoting && (
                <p className="text-xs text-muted-foreground">
                  {formatLKR(Math.round(quoteCents / quoting.guests))} per guest
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit (Rs.)</Label>
              <Input
                id="deposit"
                inputMode="decimal"
                placeholder={String(suggestedDeposit)}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Empty uses {defaultDepositBps / 100}%. 0 means no deposit.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="quote-notes">Menu and notes for the guest</Label>
              <Textarea
                id="quote-notes"
                rows={4}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoting(null)}>
              Not now
            </Button>
            <Button
              disabled={!quoting || !quoteValid || busy}
              onClick={() =>
                quoting &&
                run(
                  () =>
                    quoteEventAction({
                      inquiryId: quoting.id,
                      quoteCents,
                      depositCents,
                      notes: notes.trim() || null,
                    }),
                  "Quote sent.",
                )
              }
            >
              Send quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closing !== null} onOpenChange={(open) => !open && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {closing?.next === "cancelled" ? "Cancel this event?" : "Decline this enquiry?"}
            </DialogTitle>
            <DialogDescription>
              The guest sees the reason.
              {closing?.inquiry.deposit_status === "paid" && " Their deposit will need a refund."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="close-reason">Reason</Label>
            <Textarea
              id="close-reason"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosing(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={!closing || reason.trim().length === 0 || busy}
              onClick={() =>
                closing &&
                run(
                  () =>
                    setEventStatusAction({
                      inquiryId: closing.inquiry.id,
                      next: closing.next,
                      reason: reason.trim(),
                    }),
                  closing.next === "cancelled" ? "Event cancelled." : "Enquiry declined.",
                )
              }
            >
              {closing?.next === "cancelled" ? "Cancel event" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
