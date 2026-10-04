/**
 * Pricing and validation for one menu item with its chosen options. Pure, so
 * the browser (live price in the item sheet) and the server (authoritative
 * order pricing, Phase 2) use the same rules.
 */

export type PricedOptionValue = { id: string; priceDeltaCents: number; isDefault: boolean };
export type PricedOption = {
  id: string;
  selection: "single" | "multiple";
  isRequired: boolean;
  maxSelect: number | null;
  values: PricedOptionValue[];
};
export type PricedItem = { basePriceCents: number; options: PricedOption[] };

/** optionId → chosen value ids */
export type Selection = Record<string, string[]>;

export type SelectionIssue =
  | { optionId: string; kind: "required" }
  | { optionId: string; kind: "too-many"; max: number }
  | { optionId: string; kind: "unknown-value" };

/** Defaults marked in the data; a required single choice with no default gets its first value. */
export function defaultSelection(item: PricedItem): Selection {
  const selection: Selection = {};
  for (const option of item.options) {
    const defaults = option.values.filter((v) => v.isDefault).map((v) => v.id);
    const first = option.values[0];
    if (option.selection === "single") {
      const chosen = defaults[0] ?? (option.isRequired && first ? first.id : undefined);
      selection[option.id] = chosen ? [chosen] : [];
    } else {
      selection[option.id] = defaults;
    }
  }
  return selection;
}

export function validateSelection(item: PricedItem, selection: Selection): SelectionIssue[] {
  const issues: SelectionIssue[] = [];
  for (const option of item.options) {
    const chosen = selection[option.id] ?? [];
    const valid = new Set(option.values.map((v) => v.id));
    if (chosen.some((id) => !valid.has(id)))
      issues.push({ optionId: option.id, kind: "unknown-value" });
    if (option.isRequired && chosen.length === 0)
      issues.push({ optionId: option.id, kind: "required" });
    const max = option.selection === "single" ? 1 : option.maxSelect;
    if (max !== null && chosen.length > max)
      issues.push({ optionId: option.id, kind: "too-many", max });
  }
  const known = new Set(item.options.map((o) => o.id));
  for (const optionId of Object.keys(selection)) {
    if (!known.has(optionId)) issues.push({ optionId, kind: "unknown-value" });
  }
  return issues;
}

/**
 * Price of one unit: the branch price (or base price) plus the chosen option
 * deltas, never below zero. Assumes a valid selection.
 */
export function unitPriceCents(
  item: PricedItem,
  selection: Selection,
  branchPriceCents?: number | null,
): number {
  let total = branchPriceCents ?? item.basePriceCents;
  for (const option of item.options) {
    const chosen = new Set(selection[option.id] ?? []);
    for (const value of option.values) if (chosen.has(value.id)) total += value.priceDeltaCents;
  }
  return Math.max(0, total);
}

/** The lowest possible unit price ("from Rs. …") given required choices. */
export function fromPriceCents(item: PricedItem, branchPriceCents?: number | null): number {
  let total = branchPriceCents ?? item.basePriceCents;
  for (const option of item.options) {
    if (option.isRequired && option.values.length > 0) {
      total += Math.min(...option.values.map((v) => v.priceDeltaCents));
    }
  }
  return Math.max(0, total);
}
