import type { ActionResult } from "@/app/(staff)/dashboard/actions";

/** What staff see when a dashboard action fails. */
export const ACTION_ERRORS: Record<Exclude<ActionResult, { ok: true }>["error"], string> = {
  "not-allowed": "You can't make this change.",
  invalid: "That change isn't valid.",
  "invalid-transition": "This has already moved on. The page has been refreshed.",
  "reason-required": "Please give a reason.",
  "invalid-quote": "The deposit can't be more than the quote.",
  unknown: "Something went wrong. Please try again.",
};
