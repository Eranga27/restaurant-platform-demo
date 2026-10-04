import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/site/legal-page";
import { refundPolicy } from "@/content/legal";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/refunds">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations("Metadata");
  return pageMetadata({ locale, path: "/refunds", title: t("refundsTitle") });
}

export default async function RefundsPage() {
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return <LegalPage title={t("refundsTitle")} document={refundPolicy(brand)} />;
}
