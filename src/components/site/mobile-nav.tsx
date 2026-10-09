"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { NavItem } from "./nav-links";

const MobileNavSheet = dynamic(() => import("./mobile-nav-sheet").then((m) => m.MobileNavSheet), {
  ssr: false,
});
const preload = () => void import("./mobile-nav-sheet");

/** The "Menu" button. The full-screen menu loads on the first tap, not with every page. */
export function MobileNav({
  items,
  brandName,
  phones,
}: {
  items: NavItem[];
  brandName: string;
  phones: { name: string; phone: string }[];
}) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("menuButton")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerDown={preload}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className="group inline-flex h-10 items-center gap-2.5 rounded-full px-2 text-sm font-medium text-current hover:bg-[var(--hdr-hover)] sm:px-3"
      >
        <span aria-hidden className="flex w-5 flex-col gap-1.5">
          <span className="h-px w-full bg-current transition-transform duration-300 group-hover:translate-x-0.5" />
          <span className="h-px w-3/4 bg-current transition-[width] duration-300 group-hover:w-full" />
        </span>
        <span
          aria-hidden
          className="hdr-explore-label hidden font-mono text-[0.7rem] tracking-[0.2em] uppercase sm:inline lg:hidden xl:inline"
        >
          {t("menuButton")}
        </span>
      </button>
      {loaded && (
        <MobileNavSheet
          items={items}
          brandName={brandName}
          phones={phones}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
