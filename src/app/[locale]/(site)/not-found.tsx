import { getTranslations } from "next-intl/server";

import { Ornament } from "@/components/site/ornament";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Ornament />
      <p className="font-mono text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
        404
      </p>
      <h1 className="text-display-xl text-balance">{t("title")}</h1>
      <p className="text-pretty text-muted-foreground">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">{t("home")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/menu">{t("menu")}</Link>
        </Button>
      </div>
    </section>
  );
}
