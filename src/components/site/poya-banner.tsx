import { Moon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { HolidayView } from "@/lib/data/catalogue";

/** Shown on Poya days (docs/PLAN.md §4: calendar awareness). */
export async function PoyaBanner({ holiday }: { holiday: HolidayView | null }) {
  if (!holiday?.isAlcoholFree) return null;
  const t = await getTranslations("Poya");
  return (
    <div role="note" className="border-b bg-secondary text-secondary-foreground">
      <p className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-sm sm:px-6">
        <Moon aria-hidden className="size-4 shrink-0" />
        {t("banner", { name: holiday.name })}
      </p>
    </div>
  );
}
