import type { Metadata, Viewport } from "next";

import { defaultBrand } from "@/config/brand";
import { fontVariables } from "@/config/fonts";
import { publicEnv } from "@/lib/public-env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: `${defaultBrand.name} | ${defaultBrand.tagline}`,
    template: `%s | ${defaultBrand.name}`,
  },
  description: defaultBrand.description,
  applicationName: defaultBrand.name,
  // Phase 0 previews are not for search engines; Phase 1 opens up public pages.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: defaultBrand.colors.primary,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
