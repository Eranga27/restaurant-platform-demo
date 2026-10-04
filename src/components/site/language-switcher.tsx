"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_NAMES, LOCALE_SHORT, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

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
    <Select value={locale} onValueChange={change} disabled={isPending}>
      <SelectTrigger
        size="sm"
        aria-label={t("changeLanguage")}
        className={cn("w-auto gap-1.5 bg-card", className)}
      >
        <Languages aria-hidden className="size-4 text-muted-foreground" />
        <SelectValue>
          <span lang={locale}>{LOCALE_SHORT[locale]}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
