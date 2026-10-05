import "server-only";

import { getStaff, type Staff } from "@/lib/auth/staff";

/**
 * For admin Server Actions: the signed-in admin, with two-step sign-in done in
 * this session, or null. The database checks the same (is_admin() needs aal2).
 */
export async function getAdmin(): Promise<Staff | null> {
  const staff = await getStaff();
  return staff?.role === "admin" ? staff : null;
}

export type AdminResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

/** Turns a database error into a short message for the admin. */
export function adminError(message: string | undefined): { ok: false; error: string } {
  if (!message) return { ok: false, error: "Something went wrong. Please try again." };
  if (message.includes("not_allowed") || message.includes("row-level security"))
    return { ok: false, error: "You don't have permission to do that." };
  if (message.includes("duplicate key")) return { ok: false, error: "That already exists." };
  if (message.includes("violates foreign key"))
    return { ok: false, error: "Something else still uses this, so it can't be removed." };
  if (message.includes("violates check constraint"))
    return { ok: false, error: "One of the values isn't allowed. Please check the form." };
  console.error("[admin]", message);
  return { ok: false, error: "Something went wrong. Please try again." };
}
