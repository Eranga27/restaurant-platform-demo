"use server";

import { z } from "zod";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { publicEnv } from "@/lib/public-env";
import { clientIp } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditedClient } from "@/lib/supabase/server";

/**
 * Staff management (admins with MFA). Role changes go through
 * set_staff_role(), which refuses self-changes and removing the last admin;
 * the audit log records each one.
 */

type Result = { ok: true } | { ok: false; error: string };
const NOT_ALLOWED = { ok: false as const, error: "You don't have permission to do that." };

const roleInput = z
  .object({
    userId: z.uuid(),
    role: z.enum(["customer", "staff", "manager", "admin"]),
    branchId: z.uuid().nullable(),
  })
  .refine((v) => !["staff", "manager"].includes(v.role) || v.branchId !== null);

function roleError(message: string | undefined): Result {
  if (message?.includes("cannot_change_own_role"))
    return { ok: false, error: "You can't change your own role. Ask another admin." };
  if (message?.includes("last_admin"))
    return { ok: false, error: "There must always be at least one admin." };
  if (message?.includes("branch_required"))
    return { ok: false, error: "Staff and managers need a branch." };
  if (message?.includes("user_not_found"))
    return { ok: false, error: "No account with that email." };
  return adminError(message);
}

export async function setStaffRoleAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = roleInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Choose a role, and a branch for staff and managers." };
  const supabase = await createAuditedClient();
  const { error } = await supabase.rpc("set_staff_role", {
    target_user: parsed.data.userId,
    new_role: parsed.data.role,
    branch: parsed.data.branchId,
  });
  return error ? roleError(error.message) : { ok: true };
}

export async function findAccountAction(
  email: unknown,
): Promise<
  | { ok: true; account: { userId: string; name: string | null; role: string } }
  | { ok: false; error: string }
> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = z.email().max(254).safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const supabase = await createAuditedClient();
  const { data, error } = await supabase.rpc("admin_find_user", { lookup_email: parsed.data });
  if (error) return adminError(error.message);
  const row = (data as { user_id: string; full_name: string | null; role: string }[] | null)?.[0];
  if (!row)
    return {
      ok: false,
      error:
        "No account with that email. They can sign up on the site first, or you can invite them.",
    };
  return { ok: true, account: { userId: row.user_id, name: row.full_name, role: row.role } };
}

const inviteInput = z
  .object({
    email: z.email().max(254),
    name: z.string().trim().min(1).max(120),
    role: z.enum(["staff", "manager", "admin"]),
    branchId: z.uuid().nullable(),
  })
  .refine((v) => v.role === "admin" || v.branchId !== null);

/**
 * Creates the account and emails a link to choose a password. Supabase's
 * built-in mailer only reaches project members until a custom SMTP domain is
 * set up (docs/DECISIONS.md D10).
 */
export async function inviteStaffAction(input: unknown): Promise<Result> {
  if (!(await getAdmin())) return NOT_ALLOWED;
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  const { data, error } = await createAdminClient().auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.name },
      redirectTo: `${publicEnv.siteUrl}/login?next=/dashboard`,
    },
  );
  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already"))
      return {
        ok: false,
        error: "That email already has an account. Use “Add an existing account”.",
      };
    console.error("[admin] invite failed", error?.message);
    return { ok: false, error: "The invitation couldn't be sent." };
  }
  const supabase = await createAuditedClient();
  const { error: roleErr } = await supabase.rpc("set_staff_role", {
    target_user: data.user.id,
    new_role: parsed.data.role,
    branch: parsed.data.role === "admin" ? null : parsed.data.branchId,
  });
  return roleErr ? roleError(roleErr.message) : { ok: true };
}

/** Removes someone's authenticator, e.g. after a lost phone; they set it up again on next sign-in. */
export async function resetMfaAction(userId: unknown): Promise<Result> {
  const admin = await getAdmin();
  if (!admin) return NOT_ALLOWED;
  const parsed = z.uuid().safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  if (parsed.data === admin.userId)
    return { ok: false, error: "Ask another admin to reset your own two-step sign-in." };

  const service = createAdminClient();
  const { data, error } = await service.auth.admin.mfa.listFactors({ userId: parsed.data });
  if (error) return adminError(error.message);
  for (const factor of data?.factors ?? []) {
    const { error: deleteError } = await service.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: parsed.data,
    });
    if (deleteError) return adminError(deleteError.message);
  }
  // Supabase records this outside our tables, so log it here.
  await service.from("audit_logs").insert({
    actor_id: admin.userId,
    action: "update",
    entity: "mfa_factors",
    entity_id: parsed.data,
    before: { factors: data?.factors.length ?? 0 },
    after: { factors: 0 },
    ip: (await clientIp())?.slice(0, 64) ?? null,
  });
  return { ok: true };
}
