import { getTranslations } from "next-intl/server";

import { CartButton } from "@/components/cart/cart-button";
import { CartHydrator } from "@/components/cart/cart-hydrator";
import type { CartSettings } from "@/components/cart/cart-sheet";
import { LazyCartSheet } from "@/components/cart/lazy-cart-sheet";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { CURTAIN, LAMP } from "@/lib/transitions";

import { AccountMenu } from "./account-menu";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

/**
 * The site header. Over the home page's photo it starts transparent with light
 * text (the hero sets data-header-tone="light" on <html>; globals.css, --hdr-*)
 * and settles into paper as the page scrolls. "Menu" opens the full-screen menu.
 */
export async function SiteHeader({
  brand,
  branches,
}: {
  brand: Brand;
  branches: { id: string; name: string; phone: string }[];
}) {
  const t = await getTranslations("Nav");
  const items = [
    { href: "/menu", label: t("menu") },
    { href: "/branches", label: t("branches") },
    { href: "/reservations", label: t("bookTable") },
    { href: "/events", label: t("events") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];
  const cartSettings: CartSettings = {
    minimumOrderCents: brand.charges.minimumOrderCents,
    serviceChargePercent: brand.charges.serviceChargeBps / 100,
    branchNames: Object.fromEntries(branches.map((b) => [b.id, b.name])),
  };

  return (
    // Named for page transitions: the header stays still while pages change.
    <header
      style={{ viewTransitionName: "site-header" }}
      className="site-header sticky top-0 z-40 border-b border-[var(--hdr-border)] bg-[var(--hdr-bg)] text-[var(--hdr-fg)] backdrop-blur-md transition-[background-color,color,border-color] duration-500"
    >
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
        <Logo brand={brand} />
        <nav aria-label={t("mainNavigation")} className="hidden lg:block">
          <NavLinks
            items={items.slice(0, 5)}
            className="flex items-center gap-6 text-sm whitespace-nowrap"
            linkClassName="relative py-2 text-current opacity-85 hover:opacity-100 aria-[current=page]:opacity-100 after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out-soft hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
          />
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <AccountMenu className="hidden xl:flex" />
          <Button
            asChild
            variant="outline"
            className="hidden border-[var(--hdr-border-strong)] bg-transparent text-current hover:bg-[var(--hdr-hover)] hover:text-current xl:inline-flex"
          >
            <Link href="/reservations" transitionTypes={CURTAIN}>
              {t("bookTable")}
            </Link>
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link href="/menu" transitionTypes={LAMP}>
              {t("orderNow")}
            </Link>
          </Button>
          <CartButton />
          <MobileNav
            items={items}
            brandName={brand.name}
            phones={branches.map((b) => ({ name: b.name, phone: b.phone }))}
          />
        </div>
      </div>
      <LazyCartSheet settings={cartSettings} />
      <CartHydrator />
    </header>
  );
}
