import { getTranslations } from "next-intl/server";

import { SPLASH_SEEN_KEY } from "@/lib/splash";
import { getBrand } from "@/lib/data/brand";

import { SiteSplash } from "./site-splash";

// Runs before the splash paints: skips it if this tab has already seen it.
const SKIP_IF_SEEN = `try{if(sessionStorage.getItem("${SPLASH_SEEN_KEY}"))document.documentElement.dataset.splash="seen"}catch(e){}`;

/**
 * The splash screen, once per browser tab (docs/DECISIONS.md D63). Only on the
 * static public pages (home, menu, branches, about, contact, FAQ, policies):
 * their CSP allows this one inline script, and pages people reach from
 * emails or the payment gateway (tracking, checkout…) shouldn't wait for it.
 */
export async function Splash() {
  const [t, brand] = await Promise.all([getTranslations("Splash"), getBrand()]);
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- a fixed string, nothing from data */}
      <script dangerouslySetInnerHTML={{ __html: SKIP_IF_SEEN }} />
      <SiteSplash
        name={brand.name}
        greeting={t("greeting")}
        mark={brand.logo.mark}
        words={t("words").split("|").filter(Boolean)}
      />
    </>
  );
}
