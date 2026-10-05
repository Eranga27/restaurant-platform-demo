import "server-only";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** The signed-in customer's name, phone and email, to prefill forms. Empty strings otherwise. */
export async function contactPrefill(): Promise<{ name: string; phone: string; email: string }> {
  const user = await getCurrentUser();
  if (!user) return { name: "", phone: "", email: "" };
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();
  return {
    name: user.name ?? "",
    phone: typeof data?.phone === "string" ? data.phone : "",
    email: user.email ?? "",
  };
}
