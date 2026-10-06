import { Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { QuoteActions } from "@/components/events/quote-actions";
import { RefreshWhileWaiting } from "@/components/events/refresh-while-waiting";
import { ContactLink } from "@/components/site/contact-link";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, localize } from "@/lib/data/catalogue";
import { getInquiryByToken } from "@/lib/events/service";
import { formatLKR } from "@/lib/money";
import { onlinePaymentsEnabled } from "@/lib/payments/service";
import { formatPhone } from "@/lib/phone";

// The URL is the key to the enquiry: always fresh, never indexed. The default
// referrer policy stays (origin only, cross-site) because PayHere checks it.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events/[token]">): Promise<Metadata> {
  const { token } = await params;
  const [inquiry, t] = await Promise.all([
    getInquiryByToken(token),
    getTranslations("EventStatus"),
  ]);
  return {
    title: inquiry ? t("metaTitle", { reference: inquiry.reference }) : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: PageProps<"/[locale]/events/[token]">) {
  const [{ token, locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = rawLocale as Locale;
  const inquiry = await getInquiryByToken(token);
  if (!inquiry) notFound();

  const [t, te, format, branches, brand] = await Promise.all([
    getTranslations("EventStatus"),
    getTranslations("Events"),
    getFormatter(),
    getBranches(locale),
    getBrand(),
  ]);
  const branch = branches.find((b) => b.id === inquiry.branch_id);
  const branchName = branch?.name ?? "";
  const pkg = brand.events.packages.find((p) => p.id === inquiry.package_id);
  const date = format.dateTime(new Date(`${inquiry.event_date}T00:00:00Z`), {
    dateStyle: "full",
    timeZone: "UTC",
  });

  const accepted = inquiry.accepted_at !== null;
  const depositDue =
    inquiry.status === "quoted" &&
    accepted &&
    (inquiry.deposit_cents ?? 0) > 0 &&
    inquiry.deposit_status === "pending";
  const titleKey = inquiry.status === "quoted" && accepted ? "accepted" : inquiry.status;
  const returning = query.payment === "return";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <header className="space-y-2">
        <p className="font-mono text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {t("eyebrow", { reference: inquiry.reference })}
        </p>
        <h1 className="text-display-xl text-balance">
          {t(`titles.${titleKey}`, { name: inquiry.contact_name })}
        </h1>
        <p className="text-muted-foreground">
          {inquiry.status === "new"
            ? t("new", { branch: branchName })
            : inquiry.status === "quoted" && !accepted
              ? t("quoted", { branch: branchName })
              : inquiry.status === "confirmed"
                ? t("confirmed", { branch: branchName })
                : (inquiry.status === "declined" || inquiry.status === "cancelled") &&
                    inquiry.close_reason
                  ? t("closedReason", { reason: inquiry.close_reason })
                  : null}
        </p>
        {inquiry.status !== "done" && (
          <p className="text-sm text-muted-foreground">{t("saveLink")}</p>
        )}
      </header>

      {inquiry.quote_cents !== null &&
        inquiry.status !== "declined" &&
        inquiry.status !== "cancelled" && (
          <section
            aria-labelledby="quote-title"
            className="space-y-4 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-soft sm:p-6"
          >
            <h2 id="quote-title" className="font-display text-xl text-primary">
              {t("quote")}
            </h2>
            <dl className="space-y-2 tabular-nums">
              <div className="flex items-baseline justify-between gap-4">
                <dt>{t("quote")}</dt>
                <dd className="font-display text-3xl text-primary">
                  {formatLKR(inquiry.quote_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                <dt className="sr-only">{t("guests")}</dt>
                <dd className="ml-auto">
                  {t("perGuest", {
                    price: formatLKR(Math.round(inquiry.quote_cents / inquiry.guests)),
                  })}
                </dd>
              </div>
              {(inquiry.deposit_cents ?? 0) > 0 && (
                <>
                  <div className="flex justify-between gap-4 border-t pt-2">
                    <dt>{inquiry.deposit_status === "paid" ? t("depositPaid") : t("deposit")}</dt>
                    <dd className="font-semibold">{formatLKR(inquiry.deposit_cents!)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                    <dt>{t("balance")}</dt>
                    <dd>{formatLKR(inquiry.quote_cents - inquiry.deposit_cents!)}</dd>
                  </div>
                </>
              )}
            </dl>
            {inquiry.quote_notes && (
              <div className="rounded-xl bg-muted p-4 text-sm">
                <p className="mb-1 font-semibold">{t("quoteNotes", { branch: branchName })}</p>
                <p className="whitespace-pre-line">{inquiry.quote_notes}</p>
              </div>
            )}

            {query.payment === "cancelled" && depositDue && (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {t("paymentCancelled")}
              </p>
            )}
            {returning && depositDue ? (
              <>
                <p role="status" className="text-sm text-muted-foreground">
                  {t("paymentReturn")}
                </p>
                <RefreshWhileWaiting />
              </>
            ) : depositDue ? (
              <p className="text-sm">
                {onlinePaymentsEnabled()
                  ? t("awaitingDeposit", { amount: formatLKR(inquiry.deposit_cents!) })
                  : t("depositOffline", {
                      branch: branchName,
                      amount: formatLKR(inquiry.deposit_cents!),
                    })}
              </p>
            ) : null}

            {(inquiry.status === "quoted" && !accepted) ||
            (depositDue && onlinePaymentsEnabled()) ? (
              <QuoteActions
                token={inquiry.public_token}
                mode={inquiry.status === "quoted" && !accepted ? "respond" : "deposit"}
                depositLabel={
                  inquiry.deposit_cents
                    ? t("payDeposit", { amount: formatLKR(inquiry.deposit_cents) })
                    : ""
                }
              />
            ) : null}
          </section>
        )}

      <section
        aria-labelledby="details-title"
        className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6"
      >
        <h2 id="details-title" className="mb-4 font-display text-xl text-primary">
          {t("details")}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">{t("event")}</dt>
            <dd className="font-medium">{te(`types.${inquiry.event_type}`)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("date")}</dt>
            <dd className="font-medium">
              {date}
              {inquiry.event_time ? `, ${inquiry.event_time.slice(0, 5)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("guests")}</dt>
            <dd className="font-medium">{inquiry.guests}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("where")}</dt>
            <dd className="font-medium">
              {inquiry.service === "catering"
                ? t("catering", { venue: inquiry.venue ?? "" })
                : t("atBranch", { branch: branchName })}
            </dd>
          </div>
          {pkg && (
            <div>
              <dt className="text-sm text-muted-foreground">{t("package")}</dt>
              <dd className="font-medium">{localize(pkg.name, locale)}</dd>
            </div>
          )}
          {inquiry.budget_cents !== null && (
            <div>
              <dt className="text-sm text-muted-foreground">{t("budget")}</dt>
              <dd className="font-medium">{formatLKR(inquiry.budget_cents)}</dd>
            </div>
          )}
          {inquiry.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">{t("notes")}</dt>
              <dd className="whitespace-pre-line">{inquiry.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      {branch && (
        <ContactLink
          kind="tel"
          value={branch.phone}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <Phone aria-hidden className="size-4" />
          {t("callBranch", { branch: branchName })} · {formatPhone(branch.phone)}
        </ContactLink>
      )}
    </div>
  );
}
