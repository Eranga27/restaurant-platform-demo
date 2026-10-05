"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { createInquiryAction, type InquiryResponse } from "@/app/[locale]/(site)/events/actions";
import { Turnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES } from "@/lib/events/schema";
import { normalizeSriLankanPhone } from "@/lib/phone";

type Rules = { minGuests: number; maxGuests: number; minNoticeDays: number; earliestDate: string };

function fieldsSchema(rules: Rules) {
  return z
    .object({
      eventType: z.enum(EVENT_TYPES),
      service: z.enum(["at_branch", "catering"]),
      branchId: z.string().min(1, "required"),
      date: z
        .string()
        .min(1, "required")
        .refine((v) => v >= rules.earliestDate, "dateTooSoon"),
      time: z.string(),
      guests: z.coerce
        .number<string>()
        .int()
        .min(rules.minGuests, "guestsRange")
        .max(rules.maxGuests, "guestsRange"),
      packageId: z.string(),
      budget: z.string().regex(/^\d{0,9}$/, "required"),
      venue: z.string().max(300),
      name: z.string().trim().min(1, "required").max(120),
      phone: z
        .string()
        .trim()
        .min(1, "required")
        .refine((v) => normalizeSriLankanPhone(v) !== null, "invalidPhone"),
      email: z.email("invalidEmail").max(254),
      notes: z.string().max(1000),
    })
    .superRefine((v, ctx) => {
      if (v.service === "catering" && v.venue.trim().length < 3)
        ctx.addIssue({ code: "custom", path: ["venue"], message: "required" });
    });
}

type Fields = z.input<ReturnType<typeof fieldsSchema>>;
type Parsed = z.output<ReturnType<typeof fieldsSchema>>;
type SubmitError = Exclude<InquiryResponse, { ok: true }>["error"];

export function InquiryForm({
  branches,
  packages,
  rules,
  initialContact,
  nonce,
}: {
  branches: { id: string; name: string }[];
  packages: { id: string; name: string }[];
  rules: Rules;
  initialContact: { name: string; phone: string; email: string };
  nonce?: string;
}) {
  const t = useTranslations("Events");
  const locale = useLocale();
  const router = useRouter();
  const [schema] = useState(() => fieldsSchema(rules));
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields, unknown, Parsed>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventType: "birthday",
      service: "at_branch",
      branchId: branches[0]?.id ?? "",
      date: "",
      time: "",
      guests: String(Math.max(rules.minGuests, 25)),
      packageId: "",
      budget: "",
      venue: "",
      notes: "",
      ...initialContact,
    },
  });
  const service = useWatch({ control, name: "service" });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setSubmitError(null);
    const response = await createInquiryAction({
      branchId: values.branchId,
      eventType: values.eventType,
      service: values.service,
      date: values.date,
      time: values.time || null,
      guests: values.guests,
      packageId: values.packageId || null,
      budgetCents: values.budget ? Number(values.budget) * 100 : null,
      venue: values.service === "catering" ? values.venue.trim() : null,
      contact: { name: values.name, phone: values.phone, email: values.email },
      notes: values.notes.trim() || null,
      idempotencyKey,
      turnstileToken,
      locale,
    }).catch((): InquiryResponse => ({ ok: false, error: "unknown" }));
    if (response.ok) {
      router.push(response.path);
      return;
    }
    setSubmitting(false);
    setTurnstileToken(null);
    setTurnstileReset((n) => n + 1);
    setSubmitError(response.error);
  });

  const error = (name: keyof Fields) => {
    const message = errors[name]?.message;
    if (!message) return null;
    const text =
      message === "invalidPhone"
        ? t("invalidPhone")
        : message === "invalidEmail"
          ? t("invalidEmail")
          : message === "guestsRange"
            ? t("guestsRange", { min: rules.minGuests, max: rules.maxGuests })
            : message === "dateTooSoon"
              ? t("dateTooSoon", { days: rules.minNoticeDays })
              : t("required");
    return (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {text}
      </p>
    );
  };
  const aria = (name: keyof Fields, help?: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby":
      [errors[name] ? `${name}-error` : null, help].filter(Boolean).join(" ") || undefined,
  });
  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-2xl border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventType">{t("eventType")}</Label>
          <select id="eventType" className={selectClass} {...register("eventType")}>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("service")}</legend>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="at_branch" {...register("service")} />
              {t("serviceAtBranch")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="catering" {...register("service")} />
              {t("serviceCatering")}
            </label>
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="branchId">{t("branch")}</Label>
          <select
            id="branchId"
            className={selectClass}
            {...aria("branchId", service === "catering" ? "branch-help" : undefined)}
            {...register("branchId")}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {service === "catering" && (
            <p id="branch-help" className="text-xs text-muted-foreground">
              {t("branchCateringHelp")}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="guests">{t("guests")}</Label>
          <Input
            id="guests"
            type="number"
            inputMode="numeric"
            min={rules.minGuests}
            max={rules.maxGuests}
            {...aria("guests", "guests-help")}
            {...register("guests")}
          />
          <p id="guests-help" className="text-xs text-muted-foreground">
            {t("guestsHelp", { min: rules.minGuests, max: rules.maxGuests })}
          </p>
          {error("guests")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">{t("date")}</Label>
          <Input
            id="date"
            type="date"
            min={rules.earliestDate}
            {...aria("date")}
            {...register("date")}
          />
          {error("date")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">{t("time")}</Label>
          <Input id="time" type="time" step={900} {...register("time")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="packageId">{t("package")}</Label>
          <select id="packageId" className={selectClass} {...register("packageId")}>
            <option value="">{t("packageNone")}</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">{t("budget")}</Label>
          <Input
            id="budget"
            inputMode="numeric"
            placeholder="150000"
            {...aria("budget")}
            {...register("budget")}
          />
          {error("budget")}
        </div>
        {service === "catering" && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="venue">{t("venue")}</Label>
            <Input
              id="venue"
              autoComplete="street-address"
              {...aria("venue")}
              {...register("venue")}
            />
            {error("venue")}
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            rows={3}
            maxLength={1000}
            placeholder={t("notesPlaceholder")}
            {...register("notes")}
          />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl text-primary">{t("contactTitle")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" autoComplete="name" {...aria("name")} {...register("name")} />
            {error("name")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="077 123 4567"
              {...aria("phone")}
              {...register("phone")}
            />
            {error("phone")}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              {...aria("email", "email-help")}
              {...register("email")}
            />
            <p id="email-help" className="text-xs text-muted-foreground">
              {t("emailHelp")}
            </p>
            {error("email")}
          </div>
        </div>
      </fieldset>

      <Turnstile
        nonce={nonce}
        action="event"
        onToken={setTurnstileToken}
        resetKey={turnstileReset}
      />
      {submitError && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {t(`errors.${submitError}`)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={!turnstileToken || submitting}>
        {submitting && <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />}
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
