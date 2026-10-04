import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/site/legal-page";
import { privacyPolicy } from "@/content/legal";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations("Metadata");
  return pageMetadata({ locale, path: "/privacy", title: t("privacyTitle") });
}

export default async function PrivacyPage() {
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return <LegalPage title={t("privacyTitle")} document={privacyPolicy(brand)} />;
}
