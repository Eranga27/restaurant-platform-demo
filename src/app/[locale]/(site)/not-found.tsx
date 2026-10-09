import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Kolam } from "@/components/site/kolam";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getBrand } from "@/lib/data/brand";
import { CURTAIN, LAMP } from "@/lib/transitions";

/** A missing page: "4, the brand's mark, 4", floating gently, and two ways back to food. */
export default async function NotFound() {
  const [t, brand] = await Promise.all([getTranslations("NotFound"), getBrand()]);
  return (
    <section className="relative isolate mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-7 overflow-clip px-4 py-24 text-center">
      <Kolam
        size={9}
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 w-[40rem] -translate-1/2 text-highlight opacity-[0.07]"
      />
      <p className="intro-fade flex items-center gap-3 font-display text-[clamp(5rem,3rem+10vw,9rem)] leading-none text-primary [--d:0ms]">
        <span className="sr-only">404</span>
        <span aria-hidden>4</span>
        <Image
          src={brand.logo.mark}
          alt=""
          width={128}
          height={128}
          className="lost-mark size-[0.85em]"
        />
        <span aria-hidden>4</span>
      </p>
      <h1 className="intro-fade text-display-xl text-balance [--d:150ms]">{t("title")}</h1>
      <p className="intro-fade max-w-md text-lg text-pretty text-muted-foreground [--d:250ms]">
        {t("body")}
      </p>
      <div className="intro-fade flex flex-wrap justify-center gap-3 [--d:350ms]">
        <Button asChild size="lg">
          <Link href="/menu" transitionTypes={LAMP}>
            {t("menu")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/" transitionTypes={CURTAIN}>
            {t("home")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
