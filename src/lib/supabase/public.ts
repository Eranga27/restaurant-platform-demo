import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Anonymous Supabase client for public, cacheable reads (menu, branches). It
 * never touches cookies, so pages using it can be static or ISR. Returns null
 * when Supabase isn't configured; callers fall back to the seed data.
 */
export function createPublicClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = env();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Public URL for a file in the `media` storage bucket, or an absolute URL as-is. */
export function mediaUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https:\/\//.test(path)) return path;
  const url = env().NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/media/${path.replace(/^\/+/, "")}`;
}
