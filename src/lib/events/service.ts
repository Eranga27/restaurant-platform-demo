import "server-only";

import { after } from "next/server";
import { createTranslator } from "next-intl";
import { z } from "zod";

import { NoticeEmail } from "@/emails/notice";
import { loadMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, localize } from "@/lib/data/catalogue";
import { sendEmail } from "@/lib/email/send";
import { alertBranch } from "@/lib/notifications/new-order";
import { formatLKR } from "@/lib/money";
import { orderingEnabled } from "@/lib/orders/service";
import { formatPhone } from "@/lib/phone";
import { publicEnv } from "@/lib/public-env";
import { privateToken, shortReference } from "@/lib/references";
import { createAdminClient } from "@/lib/supabase/admin";

import type { InquiryRequest } from "./schema";

/** Enquiries can be stored: Supabase with the secret key, and events switched on. */
export async function eventsEnabled(): Promise<boolean> {
  return orderingEnabled() && (await getBrand()).features.events;
}

export function eventPath(token: string, locale: Locale): string {
  return `${locale === "en" ? "" : `/${locale}`}/events/${token}`;
}

/** The earliest event date a guest may ask for, in Sri Lanka time. */
export function earliestEventDate(minNoticeDays: number, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    new Date(now.getTime() + minNoticeDays * 86_400_000),
  );
}

export type CreateInquiryResult =
  { ok: true; token: string } | { ok: false; reason: "unavailable" | "invalid" | "unknown" };

export async function createInquiry(
  request: InquiryRequest,
  { userId }: { userId: string | null },
): Promise<CreateInquiryResult> {
  if (!(await eventsEnabled())) return { ok: false, reason: "unavailable" };
  const brand = await getBrand();
  const rules = brand.events;
  const branches = await getBranches("en");
  if (
    !branches.some((b) => b.id === request.branchId) ||
    request.guests < rules.minGuests ||
    request.guests > rules.maxGuests ||
    request.date < earliestEventDate(rules.minNoticeDays) ||
    (request.packageId !== null && !rules.packages.some((p) => p.id === request.packageId))
  )
    return { ok: false, reason: "invalid" };

  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .rpc("create_event_inquiry", {
        payload: {
          public_token: privateToken(),
          reference: shortReference(),
          branch_id: request.branchId,
          user_id: userId,
          contact_name: request.contact.name,
          contact_phone: request.contact.phone,
          contact_email: request.contact.email,
          event_type: request.eventType,
          service: request.service,
          event_date: request.date,
          event_time: request.time,
          guests: request.guests,
          package_id: request.packageId,
          budget_cents: request.budgetCents,
          venue: request.service === "catering" ? request.venue : null,
          notes: request.notes,
          idempotency_key: request.idempotencyKey,
          locale: request.locale,
        },
      })
      .single<{ inquiry_id: string; public_token: string; reference: string; created: boolean }>();
    if (!error && data) {
      if (data.created) {
        const token = data.public_token;
        const branchName = branches.find((b) => b.id === request.branchId)?.name ?? "";
        after(() =>
          Promise.all([
            sendEventEmail(token, "received").catch((e) =>
              console.error("[events] email failed", e),
            ),
            alertBranch(request.branchId, {
              title: `New event enquiry ${data.reference}`,
              body: `${request.guests} guests · ${request.eventType} · ${request.date}`,
              url: "/dashboard/events",
              tag: data.reference,
              branchName,
            }).catch((e) => console.error("[events] alert failed", e)),
          ]),
        );
      }
      return { ok: true, token: data.public_token };
    }
    if (error?.code === "23505" && error.message.includes("reference")) continue;
    console.error("[events] create_event_inquiry failed", error?.code, error?.message);
    return { ok: false, reason: "unknown" };
  }
  return { ok: false, reason: "unknown" };
}

const inquiryRow = z.object({
  public_token: z.string(),
  reference: z.string(),
  branch_id: z.uuid(),
  contact_name: z.string(),
  contact_phone: z.string(),
  contact_email: z.string(),
  event_type: z.enum(["birthday", "office", "dana", "wedding", "homecoming", "other"]),
  service: z.enum(["at_branch", "catering"]),
  event_date: z.string(),
  event_time: z.string().nullable(),
  guests: z.number().int(),
  package_id: z.string().nullable(),
  budget_cents: z.number().int().nullable(),
  venue: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["new", "quoted", "confirmed", "done", "declined", "cancelled"]),
  quote_cents: z.number().int().nullable(),
  deposit_cents: z.number().int().nullable(),
  quote_notes: z.string().nullable(),
  accepted_at: z.string().nullable(),
  deposit_status: z.enum(["none", "pending", "paid", "refunded", "charged_back"]),
  close_reason: z.string().nullable(),
  locale: z.enum(["en", "si", "ta"]),
});

export type InquiryView = z.infer<typeof inquiryRow>;

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/** The enquiry behind a private link, or null. Server only. */
export async function getInquiryByToken(token: string): Promise<InquiryView | null> {
  if (!TOKEN.test(token) || !orderingEnabled()) return null;
  const { data, error } = await createAdminClient()
    .from("event_inquiries")
    .select(
      "public_token, reference, branch_id, contact_name, contact_phone, contact_email, event_type, service, event_date, event_time, guests, package_id, budget_cents, venue, notes, status, quote_cents, deposit_cents, quote_notes, accepted_at, deposit_status, close_reason, locale",
    )
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw new Error(`Failed to load enquiry: ${error.message}`);
  return data ? inquiryRow.parse(data) : null;
}

/** The guest accepts or declines their quote. Returns the new status, or null. */
export async function respondToQuote(
  token: string,
  accept: boolean,
): Promise<"confirmed" | "quoted" | "cancelled" | null> {
  if (!TOKEN.test(token) || !orderingEnabled()) return null;
  const { data, error } = await createAdminClient().rpc("respond_to_quote", {
    inquiry_token: token,
    accept,
  });
  if (error) {
    if (!error.message.includes("quote_not_open"))
      console.error("[events] respond_to_quote failed", error.code, error.message);
    return null;
  }
  const status = z.enum(["confirmed", "quoted", "cancelled"]).parse(data);
  if (status === "confirmed") {
    after(() =>
      sendEventEmail(token, "confirmed").catch((e) => console.error("[events] email failed", e)),
    );
  }
  return status;
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

export type EventEmailKind = "received" | "quoted" | "confirmed" | "declined";

export async function sendEventEmail(token: string, kind: EventEmailKind): Promise<void> {
  const inquiry = await getInquiryByToken(token);
  if (!inquiry) return;
  const locale = inquiry.locale;
  const [brand, messages, branches] = await Promise.all([
    getBrand(),
    loadMessages(locale),
    getBranches(locale),
  ]);
  const branch = branches.find((b) => b.id === inquiry.branch_id);
  const t = createTranslator({ locale, messages, namespace: "EventEmail" });
  const types = createTranslator({ locale, messages, namespace: "Events.types" });
  const date = new Intl.DateTimeFormat(`${locale}-LK`, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${inquiry.event_date}T00:00:00Z`));
  const pkg = brand.events.packages.find((p) => p.id === inquiry.package_id);

  const rows = [
    { label: t("reference"), value: inquiry.reference },
    { label: t("event"), value: types(inquiry.event_type) },
    { label: t("date"), value: inquiry.event_time ? `${date}, ${inquiry.event_time}` : date },
    { label: t("guests"), value: String(inquiry.guests) },
    ...(pkg ? [{ label: t("package"), value: localize(pkg.name, locale) }] : []),
    ...(kind !== "received" && inquiry.quote_cents
      ? [{ label: t("quote"), value: formatLKR(inquiry.quote_cents) }]
      : []),
    ...(kind === "quoted" && inquiry.deposit_cents
      ? [{ label: t("deposit"), value: formatLKR(inquiry.deposit_cents) }]
      : []),
  ];

  await sendEmail({
    to: inquiry.contact_email,
    subject: t(`${kind}.subject`, { brand: brand.name, reference: inquiry.reference }),
    react: NoticeEmail({
      brand,
      lang: locale,
      url: `${publicEnv.siteUrl}${eventPath(inquiry.public_token, locale)}`,
      text: {
        preview: t(`${kind}.preview`, { date }),
        heading: t(`${kind}.heading`, { name: inquiry.contact_name }),
        intro: t(`${kind}.intro`, { branch: branch?.name ?? "" }),
        rows,
        note:
          kind === "declined" && inquiry.close_reason
            ? t("declined.reason", { reason: inquiry.close_reason })
            : kind === "quoted" && inquiry.quote_notes
              ? inquiry.quote_notes
              : undefined,
        button: t(`${kind}.button`),
        footer: t("footer", {
          brand: brand.name,
          phone: branch ? formatPhone(branch.phone) : formatPhone(brand.contact.phone),
        }),
      },
    }),
  });
}
