import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireEnv } from "@/lib/env";
import { clientIp } from "@/lib/security/request";

import { hardenCookie } from "./cookies";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user. RLS applies.
 */
export async function createClient({ headers }: { headers?: Record<string, string> } = {}) {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      ...(headers ? { global: { headers } } : {}),
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

/**
 * As createClient(), for admin writes: also passes the caller's IP, which the
 * database's audit log records (x-client-ip, as seen by this server).
 */
export async function createAuditedClient() {
  const ip = await clientIp();
  return createClient(ip ? { headers: { "x-client-ip": ip } } : {});
}
