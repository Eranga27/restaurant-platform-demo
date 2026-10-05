"use server";

import { z } from "zod";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { refreshPublicSite } from "@/lib/revalidate";
import { createAuditedClient } from "@/lib/supabase/server";

/** Approves or rejects a review (admins with MFA); approved ones appear on the home page. */
export async function moderateReviewAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getAdmin())) return { ok: false, error: "You don't have permission to do that." };
  const parsed = z
    .object({ reviewId: z.uuid(), decision: z.enum(["approved", "rejected"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  const supabase = await createAuditedClient();
  const { error } = await supabase.rpc("moderate_review", {
    target: parsed.data.reviewId,
    decision: parsed.data.decision,
  });
  if (error) return adminError(error.message);
  refreshPublicSite();
  return { ok: true };
}
