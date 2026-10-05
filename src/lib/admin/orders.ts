import { isoDate, ORDER_STATUSES, param, type OrderFilters } from "./data";

export const STATUS_LABEL: Record<(typeof ORDER_STATUSES)[number], string> = {
  awaiting_payment: "Awaiting payment",
  received: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "On the way",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** Turns the URL's query into validated filters (shared with the CSV export). */
export function orderFilters(
  query: Record<string, string | string[] | undefined>,
  branchIds: string[],
): OrderFilters {
  const status = param(query.status);
  const from = param(query.from);
  const to = param(query.to);
  const branch = param(query.branch);
  return {
    branchId: branch && branchIds.includes(branch) ? branch : undefined,
    status: ORDER_STATUSES.find((s) => s === status),
    from: from && isoDate.test(from) ? from : undefined,
    to: to && isoDate.test(to) ? to : undefined,
    search: param(query.q)?.slice(0, 20),
  };
}
