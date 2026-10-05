import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Import only from server code; `server-only` makes
 * the build fail if a client component pulls this in.
 *
 * Every integration is optional so the app runs locally with no accounts
 * (docs/DECISIONS.md D9). Code that needs a service calls `requireEnv()` and
 * gets a clear error naming the missing variable.
 */

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase. The publishable/secret key names replace anon/service_role;
  // the legacy names are still accepted.
  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional,
  SUPABASE_SECRET_KEY: optional,

  // PayHere (Phase 3)
  PAYHERE_MERCHANT_ID: optional,
  PAYHERE_MERCHANT_SECRET: optional,
  PAYHERE_SANDBOX: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // Email (Phase 2)
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,

  // Rate limiting
  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,

  // Bot protection
  TURNSTILE_SECRET_KEY: optional,

  // Branch alerts (Phase 4)
  VAPID_PRIVATE_KEY: optional,
  VAPID_SUBJECT: optional,
  TELEGRAM_BOT_TOKEN: optional,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

type OptionalKey = {
  [K in keyof ServerEnv]-?: undefined extends ServerEnv[K] ? K : never;
}[keyof ServerEnv];

/** Returns the variable or throws, naming it, so misconfiguration is obvious. */
export function requireEnv<K extends OptionalKey>(key: K): NonNullable<ServerEnv[K]> {
  const value = env()[key];
  if (value === undefined) {
    throw new Error(`Missing environment variable ${key}. See .env.example.`);
  }
  return value as NonNullable<ServerEnv[K]>;
}
