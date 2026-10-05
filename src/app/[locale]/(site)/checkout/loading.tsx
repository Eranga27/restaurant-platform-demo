import { getTranslations } from "next-intl/server";

import { PageSkeleton } from "@/components/site/page-skeleton";

/**
 * Shown straight away while this page loads its data. Only here, not for the
 * whole site: a loading boundary makes later notFound() answer 200, not 404.
 */
export default async function Loading() {
  const t = await getTranslations("Common");
  return <PageSkeleton label={t("loading")} />;
}
