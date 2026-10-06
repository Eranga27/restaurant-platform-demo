"use client";

import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { Kolam } from "./kolam";
import { LocalTime } from "./local-time";
import type { NavItem } from "./nav-links";

/**
 * The full-screen menu (./mobile-nav.tsx loads it on the first tap): every page
 * in large type with its number, the branches' phone numbers and the time in
 * Colombo, on the ink surface.
 */
export function MobileNavSheet({
  items,
  brandName,
  phones,
  open,
  onOpenChange,
}: {
  items: NavItem[];
  brandName: string;
  phones: { name: string; phone: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const all = [...items, { href: "/account", label: t("myAccount") }];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("closeMenu")}
        data-lenis-prevent
        className="w-full max-w-none gap-0 overflow-y-auto border-none surface-ink data-[side=right]:w-full sm:max-w-none data-[side=right]:sm:max-w-none"
      >
        <SheetTitle className="sr-only">{brandName}</SheetTitle>
        <SheetDescription className="sr-only">{t("mainNavigation")}</SheetDescription>
        <Kolam
          size={7}
          className="pointer-events-none absolute -right-24 -bottom-24 w-[28rem] text-highlight opacity-[0.12]"
        />
        <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col px-6 pt-20 pb-10 sm:px-10">
          <nav aria-label={t("mainNavigation")}>
            <ol className="space-y-1">
              {all.map((item, i) => {
                const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "group flex items-baseline gap-5 py-1 font-display text-[clamp(2.5rem,1.5rem+5vw,5.5rem)] leading-[1.05] transition-colors hover:text-highlight",
                        current && "text-highlight",
                      )}
                    >
                      <span className="w-8 font-mono text-xs tracking-[0.2em] tabular-nums opacity-50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="transition-[font-style] group-hover:italic">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="mt-auto grid gap-6 border-t border-[var(--border)] pt-8 font-mono text-xs tracking-[0.12em] uppercase sm:grid-cols-[1fr_auto]">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {phones.map((b) => (
                <li key={b.name}>
                  <a
                    href={`tel:${b.phone}`}
                    className="inline-flex items-center gap-2 opacity-80 hover:opacity-100"
                  >
                    <Phone aria-hidden className="size-3.5" />
                    {b.name} · {formatPhone(b.phone)}
                  </a>
                </li>
              ))}
            </ul>
            <p className="opacity-70">
              Colombo · <LocalTime />
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
