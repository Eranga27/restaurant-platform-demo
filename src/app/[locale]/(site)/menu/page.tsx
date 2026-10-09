import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartBar } from "@/components/cart/cart-bar";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { JsonLd } from "@/components/site/json-ld";
import { PageHeader } from "@/components/site/page-header";
import { Splash } from "@/components/site/splash";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, getMenu, getSignatureItems } from "@/lib/data/catalogue";
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
  const [t, brand, menu, branches, signatures] = await Promise.all([
    getTranslations("Menu"),
    getBrand(),
    getMenu(locale),
    getBranches(locale),
    getSignatureItems(locale),
  ]);
  // The poster's plate: the first photographed signature dish, else any photographed dish.
  const plate =
    signatures.find((i) => i.imageUrl)?.imageUrl ??
    menu.categories.flatMap((c) => c.items).find((i) => i.imageUrl)?.imageUrl ??
    null;

  return (
    <>
      <Splash />
      <JsonLd data={menuJsonLd(brand, menu, getPathname({ locale, href: "/menu" }))} />
      <PageHeader
        tone="lacquer"
        eyebrow={brand.tagline}
        title={t("title")}
        intro={t("subtitle", { serviceCharge: brand.charges.serviceChargeBps / 100 })}
        image={plate ? { src: plate, shape: "plate" } : undefined}
        band={menu.categories.map((c) => c.name)}
      />
      {/* Extra room at the bottom on phones for the order bar. */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-28 sm:px-6 md:pb-24 lg:px-8 lg:pt-24">
        <MenuBrowser menu={menu} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
      </div>
      <CartBar />
    </>
  );
}
