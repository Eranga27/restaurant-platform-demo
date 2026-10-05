import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * Who may use the branch dashboard. Checked on the server by every dashboard
 * page and action (docs/SECURITY.md principle 3: the proxy is not an auth
 * boundary). The database checks again in each function staff call.
 */

export type StaffRole = "staff" | "manager" | "admin";

export type Staff = {
  userId: string;
  name: string | null;
  email: string | null;
  role: StaffRole;
  /** The branch staff and managers work at. Null for admins, who see every branch. */
  branchId: string | null;
};

const profileRow = z.object({
  role: z.enum(["customer", "staff", "manager", "admin"]),
  branch_id: z.uuid().nullable(),
  full_name: z.string().nullable(),
});

/** The signed-in user if they are branch staff, a manager or an admin; otherwise null. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, branch_id, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  const profile = profileRow.parse(data);
  if (profile.role === "customer") return null;
  return {
    userId: user.id,
    name: profile.full_name ?? user.name,
    email: user.email,
    role: profile.role,
    branchId: profile.role === "admin" ? null : profile.branch_id,
  };
});

/**
 * For dashboard pages: sends signed-out visitors to sign in and returns null
 * for signed-in people who aren't staff (the page shows "no access").
 */
export async function requireStaffPage(nextPath: string): Promise<Staff | null> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return getStaff();
}

/** True when this staff member may act for the branch. */
export function canActForBranch(staff: Staff, branchId: string): boolean {
  return staff.role === "admin" || staff.branchId === branchId;
}
