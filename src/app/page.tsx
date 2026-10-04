import Image from "next/image";

import { defaultBrand } from "@/config/brand";

/** Placeholder until the Phase 1 home page lands. */
export default function HomePage() {
  const brand = defaultBrand;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
      <Image src={brand.logo.mark} alt="" width={88} height={88} priority />
      <div className="space-y-4">
        <p className="text-sm font-medium tracking-[0.2em] text-secondary uppercase">
          {brand.tagline}
        </p>
        <h1 className="text-display-2xl text-primary">{brand.name}</h1>
        <p className="mx-auto max-w-prose text-lg text-pretty text-muted-foreground">
          {brand.description}
        </p>
      </div>
      <p className="rounded-2xl border bg-card px-5 py-3 text-sm text-balance text-muted-foreground shadow-soft">
        Our new website is cooking. {brand.hoursSummary}.
      </p>
    </main>
  );
}
