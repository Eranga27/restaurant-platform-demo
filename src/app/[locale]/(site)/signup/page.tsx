import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthPage } from "@/components/auth/auth-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("signUpTitle"), robots: { index: false, follow: false } };
}

export default async function SignUpPage({ searchParams }: PageProps<"/[locale]/signup">) {
  const { next } = await searchParams;
  return <AuthPage mode="sign-up" next={typeof next === "string" ? next : "/"} />;
}
