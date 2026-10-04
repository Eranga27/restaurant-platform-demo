import { UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CartHydrator } from "@/components/cart/cart-hydrator";
import { CartButton, CartSheet, type CartSettings } from "@/components/cart/cart-sheet";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";

import { AccountMenu } from "./account-menu";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export async function SiteHeader({
  brand,
  branches,
}: {
  brand: Brand;
  branches: { id: string; name: string }[];
}) {
  const t = await getTranslations("Nav");
  const items = [
    { href: "/menu", label: t("menu") },
    { href: "/branches", label: t("branches") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];
  const cartSettings: CartSettings = {
    minimumOrderCents: brand.charges.minimumOrderCents,
    serviceChargePercent: brand.charges.serviceChargeBps / 100,
    branchNames: Object.fromEntries(branches.map((b) => [b.id, b.name])),
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-6">
        <Logo brand={brand} />
        <nav aria-label={t("mainNavigation")} className="hidden md:block">
          <NavLinks
            items={items}
            className="flex items-center gap-6 text-sm"
            linkClassName="py-2"
          />
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <AccountMenu className="hidden md:flex" />
          <Button asChild className="hidden lg:inline-flex">
            <Link href="/menu">
              <UtensilsCrossed data-icon="inline-start" aria-hidden />
              {t("orderNow")}
            </Link>
          </Button>
          <CartButton />
          <MobileNav items={items} brandName={brand.name} />
        </div>
      </div>
      <CartSheet settings={cartSettings} />
      <CartHydrator />
    </header>
  );
}
