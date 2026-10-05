"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { savePromoCodeAction } from "@/app/(staff)/admin/promo-codes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatLKR } from "@/lib/money";

export type PromoCode = {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "fixed";
  percent_bps: number | null;
  amount_cents: number | null;
  min_subtotal_cents: number;
  max_discount_cents: number | null;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  is_active: boolean;
  used: number;
};

type Draft = {
  id: string | null;
  code: string;
  description: string;
  kind: "percent" | "fixed";
  value: string;
  minSpend: string;
  maxDiscount: string;
  startsOn: string;
  endsOn: string;
  maxRedemptions: string;
  isActive: boolean;
};

const rupees = (cents: number | null) => (cents === null ? "" : String(cents / 100));
const toCents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
/** A date input's value, as the start or end of that day in Sri Lanka. */
const toInstant = (date: string, end: boolean) =>
  date ? `${date}T${end ? "23:59:59" : "00:00:00"}+05:30` : null;
const toDateInput = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date(iso)) : "";

const toDraft = (c: PromoCode): Draft => ({
  id: c.id,
  code: c.code,
  description: c.description,
  kind: c.kind,
  value: c.kind === "percent" ? String((c.percent_bps ?? 0) / 100) : rupees(c.amount_cents),
  minSpend: rupees(c.min_subtotal_cents),
  maxDiscount: rupees(c.max_discount_cents),
  startsOn: toDateInput(c.starts_at),
  endsOn: toDateInput(c.ends_at),
  maxRedemptions: c.max_redemptions === null ? "" : String(c.max_redemptions),
  isActive: c.is_active,
});

const blank = (): Draft => ({
  id: null,
  code: "",
  description: "",
  kind: "percent",
  value: "10",
  minSpend: "0",
  maxDiscount: "",
  startsOn: "",
  endsOn: "",
  maxRedemptions: "",
  isActive: true,
});

function describe(c: PromoCode): string {
  const value =
    c.kind === "percent"
      ? `${(c.percent_bps ?? 0) / 100}% off${c.max_discount_cents ? `, up to ${formatLKR(c.max_discount_cents)}` : ""}`
      : `${formatLKR(c.amount_cents ?? 0)} off`;
  return c.min_subtotal_cents > 0 ? `${value}, min. ${formatLKR(c.min_subtotal_cents)}` : value;
}

export function PromoCodeEditor({ codes }: { codes: PromoCode[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft) return;
    setBusy(true);
    const value = Number(draft.value);
    const result = await savePromoCodeAction({
      id: draft.id,
      code: draft.code,
      description: draft.description,
      kind: draft.kind,
      percentBps: draft.kind === "percent" ? Math.round(value * 100) : null,
      amountCents: draft.kind === "fixed" ? toCents(draft.value) : null,
      minSubtotalCents: toCents(draft.minSpend) ?? 0,
      maxDiscountCents: draft.kind === "percent" ? toCents(draft.maxDiscount) : null,
      startsAt: toInstant(draft.startsOn, false),
      endsAt: toInstant(draft.endsOn, true),
      maxRedemptions: draft.maxRedemptions ? Number(draft.maxRedemptions) : null,
      isActive: draft.isActive,
    }).catch(() => ({ ok: false as const, error: "Something went wrong." }));
    setBusy(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Promo code saved.");
    setDraft(null);
    router.refresh();
  }

  const field = (key: keyof Draft, label: string, props: React.ComponentProps<typeof Input> = {}) =>
    draft && (
      <div className="space-y-1">
        <Label htmlFor={`promo-${key}`} className="text-xs">
          {label}
        </Label>
        <Input
          id={`promo-${key}`}
          value={String(draft[key])}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          {...props}
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Discount</th>
              <th className="px-4 py-2 font-medium">Dates</th>
              <th className="px-4 py-2 text-right font-medium">Used</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <span className="font-mono font-semibold">{c.code}</span>{" "}
                  {!c.is_active && <Badge variant="outline">Off</Badge>}
                </td>
                <td className="px-4 py-2">{describe(c)}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {toDateInput(c.starts_at) || "Any time"} – {toDateInput(c.ends_at) || "no end"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {c.used}
                  {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDraft(toDraft(c))}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <div className="space-y-4 rounded-xl border p-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {field("code", "Code", { className: "font-mono uppercase", maxLength: 20 })}
            <div className="space-y-1">
              <Label htmlFor="promo-kind" className="text-xs">
                Kind
              </Label>
              <select
                id="promo-kind"
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            {field("value", draft.kind === "percent" ? "Percent off" : "Rupees off", {
              inputMode: "decimal",
            })}
            {draft.kind === "percent" &&
              field("maxDiscount", "Up to (Rs., optional)", { inputMode: "decimal" })}
            {field("minSpend", "Minimum food total (Rs.)", { inputMode: "decimal" })}
            {field("startsOn", "Starts (optional)", { type: "date" })}
            {field("endsOn", "Ends (optional)", { type: "date" })}
            {field("maxRedemptions", "Uses allowed (optional)", { inputMode: "numeric" })}
          </div>
          {field("description", "Note for staff (optional)", { maxLength: 200 })}
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.isActive}
              onCheckedChange={(isActive) => setDraft({ ...draft, isActive })}
            />
            Active
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy || !draft.code.trim() || !draft.value.trim()}>
              Save code
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setDraft(blank())}>
          New promo code
        </Button>
      )}
    </div>
  );
}
