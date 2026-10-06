"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Ornament } from "@/components/site/ornament";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * When a page fails to render: the header and footer stay, and the visitor can
 * try again or go home. The reference matches the server log entry.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Ornament />
      <h1 className="text-display-xl text-balance">{t("title")}</h1>
      <p className="text-pretty text-muted-foreground">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCcw data-icon="inline-start" aria-hidden />
          {t("retry")}
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">{t("reference", { digest: error.digest })}</p>
      )}
    </section>
  );
}
