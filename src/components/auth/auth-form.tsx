"use client";

import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Turnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { signInAction, signUpAction, type AuthState } from "@/lib/auth/actions";

export function AuthForm({
  mode,
  next,
  nonce,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  nonce?: string;
}) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const [token, setToken] = useState<string | null>(null);
  const needsBotCheck = mode === "sign-up";

  if (state.notice === "check-email") {
    return (
      <p role="status" className="flex gap-3 rounded-xl bg-success/10 p-4 text-success">
        <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
        {t("checkEmail")}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate={false}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="locale" value={locale} />
      {mode === "sign-up" && (
        <div className="space-y-2">
          <Label htmlFor="auth-name">{t("name")}</Label>
          <Input id="auth-name" name="name" autoComplete="name" required maxLength={120} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="auth-email">{t("email")}</Label>
        <Input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-password">{t("password")}</Label>
        <Input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={mode === "sign-up" ? 10 : undefined}
          aria-describedby={mode === "sign-up" ? "auth-password-help" : undefined}
        />
        {mode === "sign-up" && (
          <p id="auth-password-help" className="text-xs text-muted-foreground">
            {t("passwordHelp")}
          </p>
        )}
      </div>

      {needsBotCheck && <Turnstile nonce={nonce} action="sign-up" onToken={setToken} />}

      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || (needsBotCheck && !token)}
      >
        {pending ? t("working") : mode === "sign-in" ? t("signIn") : t("signUp")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in"
          ? t.rich("noAccount", {
              link: (chunks) => (
                <Link
                  href={{ pathname: "/signup", query: { next } }}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })
          : t.rich("haveAccount", {
              link: (chunks) => (
                <Link
                  href={{ pathname: "/login", query: { next } }}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
      </p>
      <p className="text-center text-xs text-muted-foreground">{t("guestHint")}</p>
    </form>
  );
}
