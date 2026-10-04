import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MenuBrowser } from "@/components/menu/menu-browser";
import { JsonLd } from "@/components/site/json-ld";
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
      <JsonLd data={menuJsonLd(brand, menu, getPathname({ locale, href: "/menu" }))} />
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
        <header className="mb-8 max-w-2xl space-y-3">
          <h1 className="text-display-xl text-primary">{t("title")}</h1>
          <p className="text-pretty text-muted-foreground">
            {t("subtitle", { serviceCharge: brand.charges.serviceChargeBps / 100 })}
          </p>
        </header>
        <MenuBrowser menu={menu} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
      </div>
    </>
  );
}
