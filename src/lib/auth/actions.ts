"use server";

import { z } from "zod";

import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { authEnabled, createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: "invalid" | "exists" | "weak" | "rate-limited" | "bot-check" | "unavailable" | "unknown";
  notice?: "check-email";
};

/**
 * Server Actions can't read the locale from the URL segment, so forms post it
 * in a hidden field. Anything unexpected falls back to the default.
 */
function formLocale(form: FormData): Locale {
  const value = form.get("locale");
  return routing.locales.find((l) => l === value) ?? routing.defaultLocale;
}

/** Only same-site paths, so a crafted link can't bounce people to another site. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return /^\/(?!\/)[\w\-./?=&%]*$/.test(next) ? next : "/";
}

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled()) return { error: "unavailable" };
  const parsed = credentials.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };

  const ip = (await clientIp()) ?? "unknown";
  const limit = await rateLimit("login", `${ip}:${parsed.data.email.toLowerCase()}`);
  if (!limit.ok) return { error: "rate-limited" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "over_request_rate_limit") return { error: "rate-limited" };
    return { error: "invalid" };
  }
  redirect({ href: safeNext(form.get("next")), locale: formLocale(form) });
  return {};
}

const signUp = credentials.extend({
  name: z.string().trim().min(1).max(120),
  password: z.string().min(10).max(200).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});

export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled()) return { error: "unavailable" };
  const parsed = signUp.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues.some((i) => i.path[0] === "password") ? "weak" : "invalid",
    };
  }

  const ip = await clientIp();
  const limit = await rateLimit("signup", ip ?? "unknown");
  if (!limit.ok) return { error: "rate-limited" };
  const token = form.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : null, ip)))
    return { error: "bot-check" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name } },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "exists" };
    if (error.code === "weak_password") return { error: "weak" };
    if (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
      return { error: "rate-limited" };
    }
    console.error("[auth] sign up failed", error.code, error.message);
    return { error: "unknown" };
  }
  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) return { notice: "check-email" };

  redirect({ href: safeNext(form.get("next")), locale: formLocale(form) });
  return {};
}

export async function signOutAction(form: FormData): Promise<void> {
  if (authEnabled()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect({ href: "/", locale: formLocale(form) });
}
