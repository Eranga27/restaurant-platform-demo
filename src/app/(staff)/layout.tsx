import type { Metadata, Viewport } from "next";

import { Document } from "@/components/document";
import { Toaster } from "@/components/ui/sonner";
import { brandColorVariables, getBrand } from "@/lib/data/brand";
import { publicEnv } from "@/lib/public-env";

import "../globals.css";

/** Root layout for the branch dashboard. English only (B5), never indexed. */
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: `Dashboard | ${brand.name}`, template: `%s | ${brand.name} dashboard` },
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await getBrand();
  return { themeColor: brand.colors.primary, colorScheme: "light" };
}

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <Document lang="en" style={brandColorVariables(brand)}>
      {children}
      <Toaster position="top-center" />
    </Document>
  );
}
