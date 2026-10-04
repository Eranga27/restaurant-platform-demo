import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireEnv } from "@/lib/env";

import { hardenCookie } from "./cookies";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user. RLS applies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, hardenCookie(options));
            }
          } catch {
            // Server Components can't set cookies. The proxy refreshes the
            // session on protected routes, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** Supabase is configured for sign-in (URL and publishable key present). */
export function authEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/** The signed-in user's id, name and email, or null. Verifies the session with Supabase. */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string | null;
  name: string | null;
} | null> {
  if (!authEnabled()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const meta = data.user.user_metadata as { full_name?: unknown };
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    name: typeof meta.full_name === "string" ? meta.full_name : null,
  };
}
