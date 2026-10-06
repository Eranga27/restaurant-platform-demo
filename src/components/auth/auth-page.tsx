import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/supabase/server";

import { AuthForm } from "./auth-form";

/** Shared sign-in / sign-up page body. Already signed in? Straight on to `next`. */
export async function AuthPage({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const safe = /^\/(?!\/)/.test(next) ? next : "/";
  if (await getCurrentUser()) redirect({ href: safe, locale: (await getLocale()) as Locale });

  const [t, nonce] = await Promise.all([
    getTranslations("Auth"),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-12 pb-20 sm:px-6">
      <div className="space-y-2 pb-8 text-center">
        <h1 className="text-display-xl text-balance">
          {mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}
        </h1>
        <p className="text-muted-foreground">
          {mode === "sign-in" ? t("signInSubtitle") : t("signUpSubtitle")}
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <AuthForm mode={mode} next={safe} nonce={nonce} />
      </div>
    </div>
  );
}
