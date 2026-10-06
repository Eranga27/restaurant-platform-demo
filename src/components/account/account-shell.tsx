import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", href: "/account" },
  { key: "orders", href: "/account/orders" },
  { key: "bookings", href: "/account/bookings" },
  { key: "addresses", href: "/account/addresses" },
] as const;

export type AccountTab = (typeof TABS)[number]["key"];

/** Title, tabs and content for the customer account pages. */
export async function AccountShell({
  current,
  name,
  children,
}: {
  current: AccountTab;
  name: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("Account");
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <header className="space-y-1">
        <p className="font-mono text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-display-xl text-balance">{name ? t("hello", { name }) : t("title")}</h1>
      </header>
      <nav aria-label={t("title")} className="-mx-4 flex gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.key === current ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap",
              tab.key === current
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70",
            )}
          >
            {t(`tabs.${tab.key}`)}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
