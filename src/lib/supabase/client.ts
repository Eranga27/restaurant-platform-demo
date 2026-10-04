import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";

/** Supabase client for Client Components (realtime, auth state). RLS applies. */
export function createClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}
