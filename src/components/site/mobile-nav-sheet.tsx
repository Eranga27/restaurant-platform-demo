"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";

import { NavLinks, type NavItem } from "./nav-links";

/** The phone menu's panel. Loaded on the first tap (./mobile-nav.tsx). */
export function MobileNavSheet({
  items,
  brandName,
  open,
  onOpenChange,
}: {
  items: NavItem[];
  brandName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Nav");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeLabel={t("closeMenu")} className="w-[85vw] max-w-sm gap-0">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-xl text-primary">{brandName}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t("mainNavigation")} className="flex flex-1 flex-col gap-6 p-4">
          <NavLinks
            items={items}
            className="flex flex-col"
            linkClassName="block py-3 text-lg"
            onNavigate={() => onOpenChange(false)}
          />
          <div className="mt-auto flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href="/menu" onClick={() => onOpenChange(false)}>
                {t("orderNow")}
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
