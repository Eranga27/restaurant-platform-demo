import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartBar } from "@/components/cart/cart-bar";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { JsonLd } from "@/components/site/json-ld";
import { Ornament } from "@/components/site/ornament";
import { Splash } from "@/components/site/splash";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, getMenu } from "@/lib/data/catalogue";
import { pageMetadata } from "@/lib/seo";
import { menuJsonLd } from "@/lib/structured-data";

// ISR: prices and availability refresh every 5 minutes; admin edits revalidate sooner (Phase 6).
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/menu">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return pageMetadata({
    locale,
    path: "/menu",
    title: t("menuTitle"),
    description: t("menuDescription", { name: brand.name }),
  });
}

export default async function MenuPage({ params }: PageProps<"/[locale]/menu">) {
  const locale = (await params).locale as Locale;
  const [t, brand, menu, branches] = await Promise.all([
    getTranslations("Menu"),
    getBrand(),
    getMenu(locale),
    getBranches(locale),
  ]);

  return (
    <>
      <Splash />
      <JsonLd data={menuJsonLd(brand, menu, getPathname({ locale, href: "/menu" }))} />
      {/* Extra room at the bottom on phones for the order bar. */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-28 sm:px-6 md:pb-20 lg:pt-14">
        <header data-reveal className="mb-8 max-w-2xl space-y-3">
          <Ornament />
          <h1 className="text-display-xl text-primary">{t("title")}</h1>
          <p className="text-pretty text-muted-foreground">
            {t("subtitle", { serviceCharge: brand.charges.serviceChargeBps / 100 })}
          </p>
        </header>
        <MenuBrowser menu={menu} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
      </div>
      <CartBar />
    </>
  );
}
