"use client";

import { Menu } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { NavItem } from "./nav-links";

const MobileNavSheet = dynamic(() => import("./mobile-nav-sheet").then((m) => m.MobileNavSheet), {
  ssr: false,
});
const preload = () => void import("./mobile-nav-sheet");

/** The phone menu button. Its panel loads on the first tap, not with every page. */
export function MobileNav({ items, brandName }: { items: NavItem[]; brandName: string }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerDown={preload}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <Menu aria-hidden />
      </Button>
      {loaded && (
        <MobileNavSheet items={items} brandName={brandName} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}
