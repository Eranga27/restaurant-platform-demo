"use server";

import { z } from "zod";

import { getStaffAccount } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";

/**
 * Two-step sign-in (TOTP) for staff accounts. Runs on the server so the
 * session cookies stay HttpOnly; verifying a code upgrades the session to
 * aal2 and Supabase signs out the account's other sessions.
 */

export type EnrollResponse =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: "not-allowed" | "already-enrolled" | "unknown" };

export async function startEnrollmentAction(): Promise<EnrollResponse> {
  const account = await getStaffAccount();
  if (!account) return { ok: false, error: "not-allowed" };
  const supabase = await createClient();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if ((factors?.totp ?? []).length > 0) return { ok: false, error: "already-enrolled" };
  // Drop half-finished setups, so the new QR code is the only one.
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const brand = await getBrand();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `${brand.name} ${new Date().toISOString().slice(0, 10)}`,
    issuer: brand.name,
  });
  if (error || !data) {
    console.error("[mfa] enroll failed", error?.code, error?.message);
    return { ok: false, error: "unknown" };
  }
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

const verifyInput = z.object({
  factorId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export async function verifyCodeAction(
  input: unknown,
): Promise<
  { ok: true } | { ok: false; error: "invalid" | "wrong-code" | "rate-limited" | "not-allowed" }
> {
  const account = await getStaffAccount();
  if (!account) return { ok: false, error: "not-allowed" };
  const parsed = verifyInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Six digits are guessable without a limit.
  const limit = await rateLimit(
    "login",
    `${(await clientIp()) ?? "unknown"}:mfa:${account.userId}`,
  );
  if (!limit.ok) return { ok: false, error: "rate-limited" };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
  return error ? { ok: false, error: "wrong-code" } : { ok: true };
}
