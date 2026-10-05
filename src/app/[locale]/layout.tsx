import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

import { Document } from "@/components/document";
import { OfflineSupport } from "@/components/site/offline-support";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { brandColorVariables, getBrand } from "@/lib/data/brand";
import { publicEnv } from "@/lib/public-env";
import { robotsMetadata } from "@/lib/seo";

import "../globals.css";

// Unknown locales are refused below (hasLocale → notFound). Not with
// `dynamicParams = false`: in `next start`, that makes every page 404 once
// it has been revalidated on demand (docs/DECISIONS.md D56).

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: brand.name, template: `%s | ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    robots: robotsMetadata,
    openGraph: { siteName: brand.name, type: "website" },
    formatDetection: { telephone: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await getBrand();
  return { themeColor: brand.colors.primary, colorScheme: "light" };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const brand = await getBrand();

  return (
    <Document lang={locale} style={brandColorVariables(brand)}>
      <NextIntlClientProvider>
        {children}
        <Toaster position="top-center" />
        <OfflineSupport />
      </NextIntlClientProvider>
    </Document>
  );
}
