"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";

import { NavLinks, type NavItem } from "./nav-links";

export function MobileNav({ items, brandName }: { items: NavItem[]; brandName: string }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("openMenu")}>
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" closeLabel={t("closeMenu")} className="w-[85vw] max-w-sm gap-0">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-xl text-primary">{brandName}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t("mainNavigation")} className="flex flex-1 flex-col gap-6 p-4">
          <NavLinks
            items={items}
            className="flex flex-col"
            linkClassName="block py-3 text-lg"
            onNavigate={() => setOpen(false)}
          />
          <div className="mt-auto flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href="/menu" onClick={() => setOpen(false)}>
                {t("orderNow")}
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
