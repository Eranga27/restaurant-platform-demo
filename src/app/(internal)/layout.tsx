import type { Metadata } from "next";

import { Document } from "@/components/document";
import { defaultBrand } from "@/config/brand";
import { publicEnv } from "@/lib/public-env";

import "../globals.css";

/** Root layout for internal pages (styleguide). English only, never indexed. */
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: defaultBrand.name, template: `%s | ${defaultBrand.name}` },
  robots: { index: false, follow: false },
};

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <Document lang="en">{children}</Document>;
}
