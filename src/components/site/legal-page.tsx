import { Info } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { LegalDocument } from "@/content/legal";
import { publicEnv } from "@/lib/public-env";

export async function LegalPage({ title, document }: { title: string; document: LegalDocument }) {
  const [t, format] = await Promise.all([getTranslations("Legal"), getFormatter()]);
  const updated = format.dateTime(new Date(`${document.updated}T00:00:00+05:30`), {
    dateStyle: "long",
  });

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <header className="mb-8 space-y-3">
        <h1 className="text-display-xl text-primary">{title}</h1>
        <p className="text-sm text-muted-foreground">{t("updated", { date: updated })}</p>
      </header>

      {publicEnv.demoMode && (
        <p className="mb-8 flex gap-3 rounded-xl border border-info/30 bg-info/5 p-4 text-sm text-info">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("demoNotice")}
        </p>
      )}

      <p className="mb-10 text-lg text-pretty">{document.intro}</p>
      <div className="space-y-8">
        {document.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-display-md text-primary">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-pretty text-foreground/90">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">{t("englishPrevails")}</p>
    </article>
  );
}
