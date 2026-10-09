import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { Kolam } from "@/components/site/kolam";
import { SplitWords } from "@/components/site/split-words";
import { siteMedia } from "@/config/media";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getCurrentUser } from "@/lib/supabase/server";

import { AuthForm } from "./auth-form";

/**
 * Shared sign-in / sign-up page body: on large screens a photo of the food
 * with the brand beside the form; on phones just the form. Already signed in?
 * Straight on to `next`.
 */
export async function AuthPage({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const safe = /^\/(?!\/)/.test(next) ? next : "/";
  if (await getCurrentUser()) redirect({ href: safe, locale: (await getLocale()) as Locale });

  const [t, brand, nonce] = await Promise.all([
    getTranslations("Auth"),
    getBrand(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  const title = mode === "sign-in" ? t("signInTitle") : t("signUpTitle");
  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-14">
      <div className="intro-image relative hidden min-h-[38rem] overflow-hidden rounded-[2rem] surface-ink lg:block">
        <Image
          src={siteMedia.hero}
          alt=""
          fill
          preload
          sizes="(min-width: 1280px) 40rem, 50vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,color-mix(in_srgb,var(--foreground)_88%,transparent)_100%)]"
        />
        <Kolam
          size={5}
          className="pointer-events-none absolute -top-10 -right-10 w-64 text-highlight opacity-25"
        />
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-10">
          <p className="font-display text-display-lg">{brand.name}</p>
          <p className="max-w-sm text-pretty opacity-85">{brand.tagline}</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="space-y-3 pb-8">
          <h1 className="intro-words text-display-xl text-balance">
            <SplitWords markup={title.replace(/[<>]/g, "")} />
          </h1>
          <p className="intro-fade text-lg text-muted-foreground [--d:350ms]">
            {mode === "sign-in" ? t("signInSubtitle") : t("signUpSubtitle")}
          </p>
        </div>
        <div className="intro-fade rounded-3xl border bg-card p-6 shadow-lifted [--d:450ms] sm:p-8">
          <AuthForm mode={mode} next={safe} nonce={nonce} />
        </div>
      </div>
    </div>
  );
}
