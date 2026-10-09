import { getTranslations } from "next-intl/server";

import { posterFont } from "@/config/fonts";
import { scriptString } from "@/lib/inline-script";
import { SPLASH_SEEN_KEY } from "@/lib/splash";
import { getBrand } from "@/lib/data/brand";

import { SiteSplash } from "./site-splash";

/**
 * Runs before the splash paints (docs/DECISIONS.md D112). Skips the splash if
 * this tab has already seen it. Otherwise it holds every animation on the page
 * (data-splash="wait", globals.css) until the page has really been painted and
 * the poster font has arrived, then lets them all run together
 * (data-splash="play"). Without this, a slow phone or connection would start
 * the splash's clock seconds before anything was drawn, and show only its end.
 * Never waits more than 2.5 s after the first paint for the font; meanwhile
 * the panel shows the brand's mark, breathing. Without JavaScript nothing is
 * held, and the splash runs as soon as it's styled.
 */
function startScript(fontFamily: string): string {
  const font = scriptString(`800 1em ${fontFamily}`);
  const key = scriptString(SPLASH_SEEN_KEY);
  return `try{var d=document.documentElement;if(sessionStorage.getItem(${key})){d.dataset.splash="seen"}else{d.dataset.splash="wait";var go=function(){if(d.dataset.splash==="wait")d.dataset.splash="play"};var painted=function(f){requestAnimationFrame(function(){requestAnimationFrame(f)})};painted(function(){setTimeout(go,2500)});var f=document.fonts&&document.fonts.load?document.fonts.load(${font}):Promise.resolve();f.then(function(){painted(go)},function(){painted(go)})}}catch(e){}`;
}

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
      {/* eslint-disable-next-line react/no-danger -- built from fixed strings, nothing from data */}
      <script dangerouslySetInnerHTML={{ __html: startScript(posterFont.style.fontFamily) }} />
      <SiteSplash
        name={brand.name}
        greeting={t("greeting")}
        mark={brand.logo.mark}
        words={t("words").split("|").filter(Boolean)}
      />
    </>
  );
}
