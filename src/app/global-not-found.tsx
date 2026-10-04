import type { Metadata } from "next";
import Link from "next/link";

import { Document } from "@/components/document";
import { defaultBrand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: `Page not found | ${defaultBrand.name}`,
  robots: { index: false, follow: false },
};

/** 404 for URLs outside every root layout. Localized 404s live in [locale]/(site)/not-found.tsx. */
export default function GlobalNotFound() {
  return (
    <Document lang="en">
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-secondary uppercase">404</p>
        <h1 className="text-display-lg text-primary">We couldn&apos;t find that page</h1>
        <Link href="/" className="text-primary underline underline-offset-4">
          Back to {defaultBrand.name}
        </Link>
      </main>
    </Document>
  );
}
