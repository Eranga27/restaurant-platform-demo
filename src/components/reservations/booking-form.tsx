"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  availabilityAction,
  bookTableAction,
  type BookTableResponse,
} from "@/app/[locale]/(site)/reservations/actions";
import { Turnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type { SlotAvailability } from "@/lib/reservations/slots";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Branch = { id: string; slug: string; name: string; city: string };

const fieldsSchema = z.object({
  name: z.string().trim().min(1, "required").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "required")
    .refine((v) => normalizeSriLankanPhone(v) !== null, "invalidPhone"),
  email: z.email("invalidEmail").max(254),
  notes: z.string().max(500),
});
type Fields = z.infer<typeof fieldsSchema>;

type SubmitError = Exclude<BookTableResponse, { ok: true }>["error"];

export function BookingForm({
  branches,
  initialBranchSlug,
  dates,
  maxPartySize,
  initialContact,
  nonce,
}: {
  branches: Branch[];
  initialBranchSlug?: string;
  dates: string[];
  maxPartySize: number;
  initialContact: { name: string; phone: string; email: string };
  nonce?: string;
}) {
  const t = useTranslations("Reservations");
  const locale = useLocale();
  const router = useRouter();

  const [branchId, setBranchId] = useState(
    branches.find((b) => b.slug === initialBranchSlug)?.id ?? branches[0]!.id,
  );
  const [date, setDate] = useState(dates[0]!);
  const [partySize, setPartySize] = useState(2);
  const [chosenTime, setTime] = useState<string | null>(null);
  const [seating, setSeating] = useState<"any" | "indoor" | "outdoor">("any");
  const [occasion, setOccasion] = useState<"" | "birthday" | "anniversary" | "business" | "other">(
    "",
  );
  const [loaded, setLoaded] = useState<{ key: string; slots: SlotAvailability[] } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(fieldsSchema),
    defaultValues: { ...initialContact, notes: "" },
  });

  // Free and full times for the chosen branch, day and party size.
  const key = `${branchId}|${date}|${partySize}`;
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    void availabilityAction({ branchId, date, partySize })
      .then((result) => current && setLoaded({ key, slots: result.ok ? result.slots : [] }))
      .catch(() => current && setLoaded({ key, slots: [] }));
    return () => {
      current = false;
    };
  }, [key, branchId, date, partySize, reload]);
  const slots = loaded?.key === key ? loaded.slots : null;
  // A time chosen for another day or party size no longer counts.
  const time = slots?.some((s) => s.time === chosenTime && s.available) ? chosenTime : null;

  const onSubmit = handleSubmit(async (values) => {
    if (!time) return;
    setSubmitting(true);
    setSubmitError(null);
    const response = await bookTableAction({
      branchId,
      date,
      time,
      partySize,
      seating,
      occasion: occasion || null,
      contact: { name: values.name, phone: values.phone, email: values.email },
      notes: values.notes.trim() || null,
      idempotencyKey,
      turnstileToken,
      locale,
    }).catch((): BookTableResponse => ({ ok: false, error: "unknown" }));

    if (response.ok) {
      router.push(response.path);
      return;
    }
    setSubmitting(false);
    setTurnstileToken(null);
    setTurnstileReset((n) => n + 1);
    if (response.error === "invalid") {
      for (const field of response.fields) {
        const name = field.replace(/^contact\./, "") as keyof Fields;
        if (name in fieldsSchema.shape) setError(name, { message: "required" });
      }
    }
    if (response.error === "fully-booked" || response.error === "slot-invalid") {
      // Refresh the times so the taken one shows as full.
      setTime(null);
      setLoaded(null);
      setReload((n) => n + 1);
    }
    setSubmitError(response.error);
  });

  const fieldError = (name: keyof Fields) => {
    const message = errors[name]?.message;
    if (!message) return null;
    return (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {message === "invalidPhone"
          ? t("invalidPhone")
          : message === "invalidEmail"
            ? t("invalidEmail")
            : t("required")}
      </p>
    );
  };

  const dayLabel = (iso: string) => {
    const at = new Date(`${iso}T00:00:00Z`);
    return {
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(at),
      day: new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(at),
    };
  };
  const timeLabel = (hhmm: string) =>
    new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
      new Date(`1970-01-01T${hhmm}:00Z`),
    );

  const branch = branches.find((b) => b.id === branchId)!;
  const day = dayLabel(date);
  const seatingLabel = {
    any: t("seatingAny"),
    indoor: t("seatingIndoor"),
    outdoor: t("seatingOutdoor"),
  }[seating];

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-14"
    >
      <div className="space-y-10">
        <Section n={1} title={t("branch")}>
          <RadioGroup
            value={branchId}
            onValueChange={setBranchId}
            className="grid gap-3 sm:grid-cols-3"
          >
            {branches.map((b) => (
              <Label
                key={b.id}
                htmlFor={`branch-${b.id}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 font-normal transition-[border-color,background-color,translate] duration-300 ease-out-soft",
                  b.id === branchId
                    ? "border-primary bg-primary/5"
                    : "hover:-translate-y-0.5 hover:border-foreground/40",
                )}
              >
                <RadioGroupItem value={b.id} id={`branch-${b.id}`} />
                <span className="font-semibold">{b.name}</span>
              </Label>
            ))}
          </RadioGroup>
        </Section>

        <Section n={2} title={t("partySize")}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="−"
                disabled={partySize <= 1}
                onClick={() => setPartySize((n) => Math.max(1, n - 1))}
              >
                <Minus aria-hidden />
              </Button>
              <output aria-live="polite" className="w-24 text-center text-lg font-semibold">
                {t("guestCount", { count: partySize })}
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="+"
                disabled={partySize >= maxPartySize}
                onClick={() => setPartySize((n) => Math.min(maxPartySize, n + 1))}
              >
                <Plus aria-hidden />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.rich("largeParty", {
                max: maxPartySize,
                link: (chunks) => (
                  <Link href="/events" className="link-sweep font-medium text-primary">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </Section>

        <Section n={3} title={t("date")}>
          <div
            role="radiogroup"
            aria-label={t("date")}
            className="-mx-1 flex snap-x [scrollbar-width:thin] gap-2 overflow-x-auto [mask-image:linear-gradient(90deg,#000_calc(100%-3rem),transparent)] px-1 pb-2"
          >
            {dates.map((d) => {
              const label = dayLabel(d);
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === date}
                  onClick={() => setDate(d)}
                  className={cn(
                    "flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border py-2.5 text-sm transition-[background-color,border-color,color,translate] duration-300 ease-out-soft active:scale-[0.97]",
                    d === date
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:-translate-y-0.5 hover:border-foreground/40",
                  )}
                >
                  <span className="text-xs uppercase opacity-80">{label.weekday}</span>
                  <span className="font-semibold">{label.day}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section n={4} title={t("time")}>
          {slots === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" /> {t("loadingTimes")}
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("closed")}</p>
          ) : !slots.some((s) => s.available) ? (
            <p className="text-sm text-muted-foreground">{t("noTimes")}</p>
          ) : (
            <div
              role="radiogroup"
              aria-label={t("time")}
              className="grid grid-cols-3 gap-2 sm:grid-cols-5"
            >
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  role="radio"
                  aria-checked={slot.time === time}
                  disabled={!slot.available}
                  onClick={() => setTime(slot.time)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm tabular-nums transition-[background-color,border-color,color,translate] duration-300 ease-out-soft active:scale-[0.97]",
                    slot.time === time && "border-primary bg-primary text-primary-foreground",
                    slot.available &&
                      slot.time !== time &&
                      "bg-card hover:-translate-y-0.5 hover:border-foreground/40",
                    !slot.available &&
                      "cursor-not-allowed text-muted-foreground line-through opacity-60",
                  )}
                >
                  {timeLabel(slot.time)}
                  {!slot.available && <span className="sr-only"> ({t("full")})</span>}
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section n={5} title={t("seating")}>
          <RadioGroup
            value={seating}
            onValueChange={(v) => setSeating(v as typeof seating)}
            className="flex flex-wrap gap-4"
          >
            {(
              [
                ["any", t("seatingAny")],
                ["indoor", t("seatingIndoor")],
                ["outdoor", t("seatingOutdoor")],
              ] as const
            ).map(([value, label]) => (
              <Label
                key={value}
                htmlFor={`seating-${value}`}
                className="flex items-center gap-2 font-normal"
              >
                <RadioGroupItem value={value} id={`seating-${value}`} />
                {label}
              </Label>
            ))}
          </RadioGroup>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="occasion">{t("occasion")}</Label>
            <select
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value as typeof occasion)}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">{t("occasionNone")}</option>
              {(["birthday", "anniversary", "business", "other"] as const).map((o) => (
                <option key={o} value={o}>
                  {t(`occasions.${o}`)}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section n={6} title={t("contactTitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {fieldError("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="077 123 4567"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
              {fieldError("phone")}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={["email-help", errors.email ? "email-error" : null]
                  .filter(Boolean)
                  .join(" ")}
                {...register("email")}
              />
              <p id="email-help" className="text-xs text-muted-foreground">
                {t("emailHelp")}
              </p>
              {fieldError("email")}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                rows={2}
                maxLength={500}
                placeholder={t("notesPlaceholder")}
                {...register("notes")}
              />
            </div>
          </div>
        </Section>
      </div>

      {/* The booking so far: beside the steps on large screens, where it stays in view; last on phones. */}
      <aside className="space-y-6 rounded-3xl surface-ink p-6 shadow-lifted sm:p-7 lg:sticky lg:top-28">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
            {t("title")}
          </p>
          <p key={branch.id} className="summary-swap font-display text-display-md">
            {branch.name}
          </p>
        </div>
        <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)] text-sm">
          {(
            [
              [t("date"), `${day.weekday}, ${day.day}`],
              [t("time"), time ? timeLabel(time) : "—"],
              [t("partySize"), t("guestCount", { count: partySize })],
              [t("seating"), seatingLabel],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="opacity-70">{label}</dt>
              <dd key={value} className="summary-swap text-right font-medium">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <Turnstile
          nonce={nonce}
          action="booking"
          theme="dark"
          onToken={setTurnstileToken}
          resetKey={turnstileReset}
        />
        {submitError && (
          <p
            role="alert"
            className="rounded-xl bg-[color-mix(in_srgb,var(--destructive)_30%,transparent)] p-3 text-sm"
          >
            {t(`errors.${submitError}`)}
          </p>
        )}
        {!time && slots?.some((s) => s.available) && (
          <p className="text-sm opacity-75">{t("chooseTime")}</p>
        )}
        <Button
          type="submit"
          size="lg"
          variant="highlight"
          className="w-full"
          disabled={!time || !turnstileToken || submitting}
        >
          {submitting && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
          {submitting ? t("submitting") : t("submit", { count: partySize })}
        </Button>
      </aside>
    </form>
  );
}

/** One step of the booking: its number, a title and the choices, set off by a rule. */
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-t pt-6">
      <h2 className="flex items-baseline gap-3 font-display text-2xl">
        <span aria-hidden className="text-base text-primary italic tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
