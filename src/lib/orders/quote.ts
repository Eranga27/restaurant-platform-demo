import type { PublicRows } from "@/lib/data/source";
import type { I18nText } from "@/lib/data/rows";
import { distanceKm } from "@/lib/geo";
import { openStatus, type DayKey } from "@/lib/hours";
import {
  defaultSelection,
  unitPriceCents,
  validateSelection,
  type PricedItem,
} from "@/lib/pricing/item";
import {
  priceOrder,
  promoDiscountCents,
  type Charges,
  type OrderTotals,
  type PromoRule,
} from "@/lib/pricing/order";

import type { QuoteRequest } from "./schema";

/**
 * Validates and prices an order request against the live catalogue. Pure:
 * the caller passes in the catalogue rows, the promo code (if any) and the
 * current time, so every rule is unit-tested.
 */

/** Scheduled orders: at least this far ahead, at most this many days. */
export const SCHEDULE_LEAD_MINUTES = 30;
export const SCHEDULE_MAX_DAYS = 3;

export type PromoRecord = {
  id: string;
  code: string;
  rule: PromoRule;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export type QuoteIssue =
  | { code: "branch-unavailable" }
  | { code: "branch-closed"; opensAt: { day: DayKey; time: string } | null }
  | { code: "schedule-invalid" }
  | { code: "item-unavailable"; lineIndex: number }
  | { code: "item-not-today"; lineIndex: number }
  | { code: "options-invalid"; lineIndex: number }
  | { code: "location-required" }
  | { code: "outside-delivery-area"; distanceKm: number; radiusKm: number }
  | { code: "below-minimum"; minimumCents: number }
  | { code: "promo-invalid" }
  | { code: "promo-expired" }
  | { code: "promo-min-spend"; minSubtotalCents: number };

export type OptionSnapshot = { option: I18nText; value: I18nText; priceDeltaCents: number };

export type QuotedLine = {
  lineIndex: number;
  menuItemId: string;
  name: I18nText;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  options: OptionSnapshot[];
  spiceLevel: "mild" | "medium" | "hot" | null;
  instructions: string | null;
};

export type Quote = {
  lines: QuotedLine[];
  totals: OrderTotals;
  distanceKm: number | null;
  promo: { id: string; code: string } | null;
  issues: QuoteIssue[];
};

export type QuoteContext = {
  rows: Pick<PublicRows, "branches" | "items" | "options" | "values" | "overrides" | "holidays">;
  charges: Charges;
  minimumOrderCents: number;
  alcoholServed: boolean;
  /** Looked up by the caller (codes aren't readable through the public API). */
  promo: PromoRecord | null;
  now: Date;
};

export function quoteOrder(request: QuoteRequest, ctx: QuoteContext): Quote {
  const issues: QuoteIssue[] = [];
  const { rows, now } = ctx;

  const branch = rows.branches.find((b) => b.id === request.branchId);
  if (!branch || !branch.is_accepting_orders) issues.push({ code: "branch-unavailable" });

  // When: as soon as possible (branch must be open) or a valid future slot.
  if (branch) {
    if (request.scheduledFor) {
      const at = new Date(request.scheduledFor);
      const earliest = now.getTime() + SCHEDULE_LEAD_MINUTES * 60_000;
      const latest = now.getTime() + SCHEDULE_MAX_DAYS * 86_400_000;
      if (
        Number.isNaN(at.getTime()) ||
        at.getTime() < earliest ||
        at.getTime() > latest ||
        !openStatus(branch.opening_hours, at).open
      ) {
        issues.push({ code: "schedule-invalid" });
      }
    } else {
      const status = openStatus(branch.opening_hours, now);
      if (!status.open) issues.push({ code: "branch-closed", opensAt: status.opensAt });
    }
  }

  // Alcohol is not served on Poya days (by the date the order is for).
  const forDate = colomboDate(request.scheduledFor ? new Date(request.scheduledFor) : now);
  const alcoholFree = rows.holidays.some((h) => h.date === forDate && h.is_alcohol_free);

  const itemsById = new Map(rows.items.map((i) => [i.id, i]));
  const overrides = new Map(
    rows.overrides.filter((o) => o.branch_id === request.branchId).map((o) => [o.menu_item_id, o]),
  );

  const lines: QuotedLine[] = [];
  request.lines.forEach((line, lineIndex) => {
    const item = itemsById.get(line.menuItemId);
    const override = overrides.get(line.menuItemId);
    if (!item || override?.is_available === false || (item.is_alcohol && !ctx.alcoholServed)) {
      issues.push({ code: "item-unavailable", lineIndex });
      return;
    }
    if (item.is_alcohol && alcoholFree) {
      issues.push({ code: "item-not-today", lineIndex });
      return;
    }

    const options = rows.options.filter((o) => o.menu_item_id === item.id);
    const priced: PricedItem = {
      basePriceCents: item.base_price_cents,
      options: options.map((o) => ({
        id: o.id,
        selection: o.selection,
        isRequired: o.is_required,
        maxSelect: o.max_select,
        values: rows.values
          .filter((v) => v.option_id === o.id)
          .map((v) => ({
            id: v.id,
            priceDeltaCents: v.price_delta_cents,
            isDefault: v.is_default,
          })),
      })),
    };

    // An item with no options may arrive with an empty selection; fill defaults
    // only for options the client didn't mention, then validate strictly.
    const selection = { ...defaultSelection(priced), ...line.selection };
    if (
      validateSelection(priced, selection).length > 0 ||
      (line.spiceLevel && !item.spice_selectable)
    ) {
      issues.push({ code: "options-invalid", lineIndex });
      return;
    }

    const unit = unitPriceCents(priced, selection, override?.price_cents ?? null);
    const chosen = new Set(Object.values(selection).flat());
    lines.push({
      lineIndex,
      menuItemId: item.id,
      name: item.name_i18n,
      unitPriceCents: unit,
      quantity: line.quantity,
      lineTotalCents: unit * line.quantity,
      options: options.flatMap((o) =>
        rows.values
          .filter((v) => v.option_id === o.id && chosen.has(v.id))
          .map((v) => ({
            option: o.name_i18n,
            value: v.name_i18n,
            priceDeltaCents: v.price_delta_cents,
          })),
      ),
      spiceLevel: item.spice_selectable ? (line.spiceLevel ?? "medium") : null,
      instructions: line.instructions || null,
    });
  });

  // Where: delivery needs a pin inside the branch's radius.
  let distance: number | null = null;
  if (request.type === "delivery" && branch) {
    if (!request.location) {
      issues.push({ code: "location-required" });
    } else {
      distance = round2(distanceKm({ lat: branch.lat, lng: branch.lng }, request.location));
      if (distance > branch.delivery_radius_km) {
        issues.push({
          code: "outside-delivery-area",
          distanceKm: distance,
          radiusKm: branch.delivery_radius_km,
        });
      }
    }
  }

  // Promo code.
  let promo: PromoRule | null = null;
  let appliedPromo: Quote["promo"] = null;
  if (request.promoCode) {
    const record = ctx.promo;
    if (!record || !record.isActive || record.code !== request.promoCode) {
      issues.push({ code: "promo-invalid" });
    } else if (
      (record.startsAt && new Date(record.startsAt) > now) ||
      (record.endsAt && new Date(record.endsAt) <= now)
    ) {
      issues.push({ code: "promo-expired" });
    } else {
      promo = record.rule;
      appliedPromo = { id: record.id, code: record.code };
    }
  }

  const lineTotalsCents = lines.map((l) => l.lineTotalCents);
  const subtotal = lineTotalsCents.reduce((s, n) => s + n, 0);
  if (promo && promoDiscountCents(promo, subtotal) === 0) {
    issues.push({ code: "promo-min-spend", minSubtotalCents: promo.minSubtotalCents });
    promo = null;
    appliedPromo = null;
  }

  if (request.type === "delivery" && subtotal < ctx.minimumOrderCents) {
    issues.push({ code: "below-minimum", minimumCents: ctx.minimumOrderCents });
  }

  const totals = priceOrder({
    lineTotalsCents,
    charges: ctx.charges,
    promo,
    delivery:
      request.type === "delivery" && branch && distance !== null
        ? { rules: branch.delivery_fee_rules, distanceKm: distance }
        : null,
  });

  return { lines, totals, distanceKm: distance, promo: appliedPromo, issues };
}

function colomboDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(at);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
