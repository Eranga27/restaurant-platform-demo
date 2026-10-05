import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Refreshes every localized public page (home, menu, branches…) after an
 * admin or staff change, instead of waiting for their time-based refresh.
 * Uses the route pattern, as the Next.js docs require for dynamic segments.
 */
export function refreshPublicSite(): void {
  revalidatePath("/[locale]", "layout");
}
