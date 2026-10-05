import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { SecurityPanel } from "@/components/dashboard/security-panel";
import { getStaffAccount } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Two-step sign-in" };

/** Only paths inside the staff areas. */
function safeNext(value: string | string[] | undefined): string {
  return typeof value === "string" && /^\/(dashboard|admin)(\/[\w\-./?=&%]*)?$/.test(value)
    ? value
    : "/dashboard";
}

export default async function SecurityPage({ searchParams }: PageProps<"/dashboard/security">) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/security?next=${next}`)}`);
  const account = await getStaffAccount();
  if (!account) return <NoAccess reason="not-staff" />;

  const supabase = await createClient();
  const [{ data: factors }, brand] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    getBrand(),
  ]);
  const verified = factors?.totp?.[0] ?? null;
  const required = account.role !== "staff";

  return (
    <main id="main" className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-14">
      <header className="space-y-2">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{brand.name}</p>
        <h1 className="text-display-md text-primary">Two-step sign-in</h1>
        <p className="text-muted-foreground">
          {required
            ? "Managers and admins confirm each sign-in with a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password and others)."
            : "Optional for branch staff: confirm each sign-in with a 6-digit code from an authenticator app."}
        </p>
      </header>
      <SecurityPanel
        mode={account.mfaVerified ? "done" : verified ? "challenge" : "enroll"}
        factorId={verified?.id ?? null}
        next={next}
        required={required}
      />
    </main>
  );
}
