import { FlaskConical } from "lucide-react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";

import { publicEnv } from "@/lib/public-env";

/** Thin bar above the header in demo mode (NEXT_PUBLIC_DEMO_MODE). */
export async function DemoRibbon() {
  if (!publicEnv.demoMode) return null;
  const t = await getTranslations("Demo");
  return (
    <div className="bg-highlight text-highlight-foreground">
      <p className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs sm:px-6">
        <FlaskConical aria-hidden className="size-3.5 shrink-0" />
        <strong className="font-semibold">{t("ribbon")}</strong>
        <span className="hidden sm:inline">· {t("ribbonDetail")}</span>
        {/* The tour is outside the localized site (English, like staff screens). */}
        <NextLink href="/demo" className="font-semibold underline underline-offset-2">
          {t("tour")}
        </NextLink>
      </p>
    </div>
  );
}
