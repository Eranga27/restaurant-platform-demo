"use server";

import { adminError, getAdmin } from "@/lib/admin/guard";
import { checkBrand, overridesFor } from "@/lib/admin/settings";
import { refreshPublicSite } from "@/lib/revalidate";
import { createAuditedClient } from "@/lib/supabase/server";

/** Saves the brand settings (admins with MFA). Validated in full, stored as overrides. */
export async function saveSettingsAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getAdmin())) return { ok: false, error: "You don't have permission to do that." };
  const checked = checkBrand(input);
  if (!checked.ok) return checked;
  const supabase = await createAuditedClient();
  const { error } = await supabase
    .from("settings")
    .update({ brand: overridesFor(checked.brand) })
    .eq("id", 1);
  if (error) return adminError(error.message);
  refreshPublicSite();
  return { ok: true };
}
