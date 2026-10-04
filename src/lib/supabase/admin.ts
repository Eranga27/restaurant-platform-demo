import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/env";

/**
 * Privileged client using the secret key. Bypasses RLS, so use it only in
 * server code that has already checked who the caller is and what they may do.
 * Never pass its results to the client without filtering.
 */
export function createAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
