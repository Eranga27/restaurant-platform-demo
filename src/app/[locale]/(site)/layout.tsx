import { getLocale, getTranslations } from "next-intl/server";

import { DemoRibbon } from "@/components/site/demo-ribbon";
import { PoyaBanner } from "@/components/site/poya-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, getTodaysHoliday } from "@/lib/data/catalogue";

// Pages are static and refresh every 10 minutes, so the Poya banner and
// catalogue changes appear without a deploy.
export const revalidate = 600;

export default async function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = (await getLocale()) as Locale;
  const [t, brand, branches, holiday] = await Promise.all([
    getTranslations("Nav"),
    getBrand(),
    getBranches(locale),
    getTodaysHoliday(locale),
  ]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      <DemoRibbon />
      <PoyaBanner holiday={holiday} />
      <SiteHeader brand={brand} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <SiteFooter brand={brand} branches={branches} />
    </>
  );
}
