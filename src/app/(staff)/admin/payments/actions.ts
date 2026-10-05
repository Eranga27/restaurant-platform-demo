"use server";

import { z } from "zod";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { createAuditedClient } from "@/lib/supabase/server";

/**
 * Records a refund made in the PayHere merchant portal (D53). Marks the
 * payment and its order or deposit as refunded; the audit log keeps who and when.
 */
export async function markRefundedAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getAdmin())) return { ok: false, error: "You don't have permission to do that." };
  const parsed = z
    .object({ paymentId: z.uuid(), note: z.string().trim().max(300) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form." };
  const supabase = await createAuditedClient();
  const { error } = await supabase.rpc("mark_payment_refunded", {
    target: parsed.data.paymentId,
    note: parsed.data.note || null,
  });
  if (error?.message.includes("not_refundable"))
    return { ok: false, error: "Only paid payments can be marked as refunded." };
  return error ? adminError(error.message) : { ok: true };
}
