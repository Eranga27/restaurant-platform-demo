"use client";

import { ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_NAMES, LOCALE_SHORT, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * The language menu: a native <select> laid over the short label, so phones
 * show their own picker and no dropdown library loads with every page.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function change(next: string) {
    // Keep the query string (e.g. an open menu item) and the section anchor.
    const href = `${pathname}${window.location.search}${window.location.hash}`;
    startTransition(() => {
      router.replace(href, { locale: next as Locale, scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "relative inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--hdr-border-strong,var(--input))] px-3 text-sm",
        "transition-colors hover:bg-[var(--hdr-hover,var(--muted))] has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring",
        isPending && "opacity-60",
        className,
      )}
    >
      <Languages aria-hidden className="size-4 opacity-70" />
      <span aria-hidden lang={locale}>
        {LOCALE_SHORT[locale]}
      </span>
      <ChevronDown aria-hidden className="size-4 opacity-70" />
      <select
        aria-label={t("changeLanguage")}
        value={locale}
        disabled={isPending}
        onChange={(e) => change(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
