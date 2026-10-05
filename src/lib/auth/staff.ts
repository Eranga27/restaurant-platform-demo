import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * Who may use the branch dashboard and the admin panel. Checked on the server
 * by every page and action (docs/SECURITY.md principle 3: the proxy is not an
 * auth boundary). The database checks again in each function staff call.
 *
 * Managers and admins must have passed two-step sign-in (TOTP, "aal2") in
 * this session (D49). Until they have, they're sent to /dashboard/security.
 */

export type StaffRole = "staff" | "manager" | "admin";

export type StaffAccount = {
  userId: string;
  name: string | null;
  email: string | null;
  role: StaffRole;
  /** The branch staff and managers work at. Null for admins, who see every branch. */
  branchId: string | null;
  /** This session passed two-step sign-in. */
  mfaVerified: boolean;
  /** A manager or admin who still has to set up or enter their code. */
  needsMfa: boolean;
};

export type Staff = StaffAccount & { needsMfa: false };

const profileRow = z.object({
  role: z.enum(["customer", "staff", "manager", "admin"]),
  branch_id: z.uuid().nullable(),
  full_name: z.string().nullable(),
});

/** The signed-in user's staff account (whether or not MFA is done), or null. */
export const getStaffAccount = cache(async (): Promise<StaffAccount | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data, error }, { data: aal }] = await Promise.all([
    supabase.from("profiles").select("role, branch_id, full_name").eq("id", user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (error || !data) return null;
  const profile = profileRow.parse(data);
  if (profile.role === "customer") return null;
  const mfaVerified = aal?.currentLevel === "aal2";
  return {
    userId: user.id,
    name: profile.full_name ?? user.name,
    email: user.email,
    role: profile.role,
    branchId: profile.role === "admin" ? null : profile.branch_id,
    mfaVerified,
    needsMfa: profile.role !== "staff" && !mfaVerified,
  };
});

/** Staff who may act right now: signed in, staff role, and MFA done where required. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const account = await getStaffAccount();
  return account && !account.needsMfa ? (account as Staff) : null;
});

/**
 * For dashboard pages: sends signed-out visitors to sign in, and managers and
 * admins without MFA to set it up. Returns null for signed-in people who
 * aren't staff (the page shows "no access").
 */
export async function requireStaffPage(nextPath: string): Promise<Staff | null> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const account = await getStaffAccount();
  if (account?.needsMfa) redirect(`/dashboard/security?next=${encodeURIComponent(nextPath)}`);
  return account as Staff | null;
}

/** For admin pages: as above, and only admins get through. */
export async function requireAdminPage(nextPath: string): Promise<Staff | null> {
  const staff = await requireStaffPage(nextPath);
  return staff?.role === "admin" ? staff : null;
}

/** True when this staff member may act for the branch. */
export function canActForBranch(staff: Staff, branchId: string): boolean {
  return staff.role === "admin" || staff.branchId === branchId;
}
