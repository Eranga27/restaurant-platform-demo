"use client";

import { CircleUser, LayoutDashboard, LogOut } from "lucide-react";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type Me =
  | { signedIn: false }
  | { signedIn: true; name: string | null; email: string | null; staff?: boolean };

/** Sign-in link or the signed-in user's name, fetched after load (cookies are HttpOnly). */
export function AccountMenu({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : { signedIn: false as const }))
      .then((data) => !cancelled && setMe(data))
      .catch(() => !cancelled && setMe({ signedIn: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!me) return <span aria-hidden className={cn("h-8 w-20", className)} />;

  if (!me.signedIn) {
    return (
      <Button asChild variant="ghost" size="sm" className={className}>
        <Link href="/login">
          <CircleUser data-icon="inline-start" aria-hidden />
          {t("signIn")}
        </Link>
      </Button>
    );
  }

  return (
    <form action={signOutAction} className={cn("items-center gap-1", className)}>
      <input type="hidden" name="locale" value={locale} />
      {me.staff && (
        // Staff screens sit outside locale routing: not the localized Link.
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={t("dashboard")}
          title={t("dashboard")}
        >
          <NextLink href="/dashboard">
            <LayoutDashboard aria-hidden />
          </NextLink>
        </Button>
      )}
      <Link
        href="/account"
        className="max-w-32 truncate text-sm text-muted-foreground hover:text-foreground"
        title={t("myAccount")}
      >
        {me.name ?? me.email}
      </Link>
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label={t("signOut")}
        title={t("signOut")}
      >
        <LogOut aria-hidden />
      </Button>
    </form>
  );
}
