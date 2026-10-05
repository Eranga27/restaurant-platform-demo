"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { startEnrollmentAction, verifyCodeAction } from "@/app/(staff)/dashboard/security/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERRORS = {
  invalid: "Enter the 6-digit code from your app.",
  "wrong-code": "That code didn't work. Codes change every 30 seconds: try the current one.",
  "rate-limited": "Too many attempts. Please wait a few minutes.",
  "not-allowed": "This account can't use two-step sign-in here.",
  "already-enrolled": "Two-step sign-in is already set up. Enter a code instead.",
  unknown: "Something went wrong. Please try again.",
} as const;

type Mode = "enroll" | "challenge" | "done";

export function SecurityPanel({
  mode: initialMode,
  factorId: initialFactor,
  next,
  required,
}: {
  mode: Mode;
  factorId: string | null;
  next: string;
  required: boolean;
}) {
  const router = useRouter();
  const [mode] = useState(initialMode);
  const [setup, setSetup] = useState<{ factorId: string; qrCode: string; secret: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof ERRORS | null>(null);

  async function begin() {
    setBusy(true);
    setError(null);
    const result = await startEnrollmentAction().catch(() => ({
      ok: false as const,
      error: "unknown" as const,
    }));
    setBusy(false);
    if (result.ok) setSetup(result);
    else setError(result.error);
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const factorId = setup?.factorId ?? initialFactor;
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const result = await verifyCodeAction({ factorId, code: code.trim() }).catch(() => ({
      ok: false as const,
      error: "invalid" as const,
    }));
    if (result.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(result.error);
  }

  if (mode === "done") {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
        <p className="flex items-center gap-2 font-semibold text-success">
          <ShieldCheck aria-hidden className="size-5" /> Two-step sign-in is on for this session.
        </p>
        <Button asChild>
          <Link href={next}>Continue</Link>
        </Button>
      </div>
    );
  }

  const codeForm = (
    <form onSubmit={verify} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="code">6-digit code</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          className="max-w-40 font-mono text-lg tracking-[0.3em]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-error" : undefined}
          autoFocus
        />
      </div>
      {error && (
        <p id="code-error" role="alert" className="text-sm text-destructive">
          {ERRORS[error]}
        </p>
      )}
      <Button type="submit" disabled={busy || code.length !== 6}>
        {busy && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
        Confirm
      </Button>
    </form>
  );

  if (mode === "challenge") {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
        <p>Open your authenticator app and enter the current code.</p>
        {codeForm}
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
      {!setup ? (
        <>
          <p>
            {required
              ? "Set it up once: scan a QR code with your app, then enter the code it shows."
              : "Scan a QR code with your app, then enter the code it shows."}
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {ERRORS[error]}
            </p>
          )}
          <Button onClick={begin} disabled={busy}>
            {busy && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
            Set up two-step sign-in
          </Button>
        </>
      ) : (
        <>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>In your authenticator app, add an account and scan this code.</li>
            <li>Then enter the 6-digit code the app shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URL from Supabase */}
          <img
            src={setup.qrCode}
            alt="QR code for your authenticator app"
            width={200}
            height={200}
            className="rounded-lg border bg-white p-2"
          />
          <details className="text-sm">
            <summary className="cursor-pointer">Can&apos;t scan it? Enter this key instead</summary>
            <code className="mt-2 block font-mono break-all">{setup.secret}</code>
          </details>
          {codeForm}
        </>
      )}
    </div>
  );
}
