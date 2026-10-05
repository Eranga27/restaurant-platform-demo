import "server-only";

import { after } from "next/server";
import { createTranslator } from "next-intl";
import { z } from "zod";

import { NoticeEmail } from "@/emails/notice";
import { loadMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { getPublicRows } from "@/lib/data/source";
import { sendEmail } from "@/lib/email/send";
import { orderingEnabled } from "@/lib/orders/service";
import { formatPhone } from "@/lib/phone";
import { publicEnv } from "@/lib/public-env";
import { privateToken, shortReference } from "@/lib/references";
import { createAdminClient } from "@/lib/supabase/admin";

import type { AvailabilityRequest, BookingRequest } from "./schema";
import {
  availability,
  bookableDates,
  colomboInstant,
  onlineSeats,
  seatingMinutes,
  type Booking,
  type SlotAvailability,
} from "./slots";

/** Bookings can be stored: Supabase with the secret key, and reservations switched on. */
export async function reservationsEnabled(): Promise<boolean> {
  return orderingEnabled() && (await getBrand()).features.reservations;
}

export function reservationPath(token: string, locale: Locale): string {
  return `${locale === "en" ? "" : `/${locale}`}/reservations/${token}`;
}

const bookingRow = z.object({
  starts_at: z.string(),
  ends_at: z.string(),
  party_size: z.number().int(),
});

/** Active bookings at a branch on a date (all of it, in Sri Lanka time). */
async function bookingsOn(branchId: string, date: string): Promise<Booking[]> {
  const dayStart = colomboInstant(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 30 * 60 * 60 * 1000); // past midnight too
  const { data, error } = await createAdminClient()
    .from("reservations")
    .select("starts_at, ends_at, party_size")
    .eq("branch_id", branchId)
    .in("status", ["confirmed", "seated"])
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());
  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  return z
    .array(bookingRow)
    .parse(data ?? [])
    .map((b) => ({
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
      partySize: b.party_size,
    }));
}

/** Free and full start times for a party on a date. Reveals no booking details. */
export async function getAvailability(
  request: AvailabilityRequest,
  now = new Date(),
): Promise<SlotAvailability[]> {
  const [brand, rows] = await Promise.all([getBrand(), getPublicRows()]);
  const branch = rows.branches.find((b) => b.id === request.branchId);
  const rules = brand.reservations;
  if (
    !branch ||
    request.partySize > rules.maxPartySize ||
    !bookableDates(now, rules).includes(request.date)
  )
    return [];
  return availability({
    hours: branch.opening_hours,
    date: request.date,
    partySize: request.partySize,
    capacity: branch.seating_capacity,
    bookings: await bookingsOn(branch.id, request.date),
    rules,
    now,
  });
}

export type BookTableResult =
  | { ok: true; token: string; reference: string }
  | { ok: false; reason: "unavailable" | "slot-invalid" | "fully-booked" | "unknown" };

export async function bookTable(
  request: BookingRequest,
  { userId }: { userId: string | null },
): Promise<BookTableResult> {
  if (!(await reservationsEnabled())) return { ok: false, reason: "unavailable" };
  const [brand, rows] = await Promise.all([getBrand(), getPublicRows()]);
  const branch = rows.branches.find((b) => b.id === request.branchId);
  const rules = brand.reservations;
  if (!branch || request.partySize > rules.maxPartySize)
    return { ok: false, reason: "slot-invalid" };

  // The time must be one the form would offer right now.
  const slots = await getAvailability(request);
  const slot = slots.find((s) => s.time === request.time);
  if (!slot) return { ok: false, reason: "slot-invalid" };
  if (!slot.available) return { ok: false, reason: "fully-booked" };

  const startsAt = colomboInstant(request.date, request.time);
  const endsAt = new Date(startsAt.getTime() + seatingMinutes(request.partySize, rules) * 60_000);
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .rpc("book_table", {
        payload: {
          public_token: privateToken(),
          reference: shortReference(),
          branch_id: branch.id,
          user_id: userId,
          guest_name: request.contact.name,
          guest_phone: request.contact.phone,
          guest_email: request.contact.email,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          party_size: request.partySize,
          seating: request.seating,
          occasion: request.occasion,
          notes: request.notes,
          idempotency_key: request.idempotencyKey,
          locale: request.locale,
          // The database re-checks capacity under a lock (D43).
          seats_limit: onlineSeats(branch.seating_capacity, rules),
        },
      })
      .single<{
        reservation_id: string;
        public_token: string;
        reference: string;
        created: boolean;
      }>();
    if (!error && data) {
      if (data.created) {
        const token = data.public_token;
        after(() =>
          sendReservationEmail(token, "confirmed").catch((e) =>
            console.error("[booking] email failed", e),
          ),
        );
      }
      return { ok: true, token: data.public_token, reference: data.reference };
    }
    if (error?.message.includes("fully_booked")) return { ok: false, reason: "fully-booked" };
    if (error?.code === "23505" && error.message.includes("reference")) continue;
    console.error("[booking] book_table failed", error?.code, error?.message);
    return { ok: false, reason: "unknown" };
  }
  return { ok: false, reason: "unknown" };
}

const reservationRow = z.object({
  public_token: z.string(),
  reference: z.string(),
  branch_id: z.uuid(),
  guest_name: z.string(),
  guest_email: z.string().nullable(),
  starts_at: z.string(),
  party_size: z.number().int(),
  seating: z.enum(["any", "indoor", "outdoor"]),
  occasion: z.enum(["birthday", "anniversary", "business", "other"]).nullable(),
  notes: z.string().nullable(),
  status: z.enum(["confirmed", "seated", "completed", "no_show", "cancelled"]),
  cancelled_by: z.enum(["guest", "branch"]).nullable(),
  cancel_reason: z.string().nullable(),
  locale: z.enum(["en", "si", "ta"]),
});

export type ReservationView = z.infer<typeof reservationRow> & { canCancel: boolean };

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/** The booking behind a private link, or null. Server only. */
export async function getReservationByToken(token: string): Promise<ReservationView | null> {
  if (!TOKEN.test(token) || !orderingEnabled()) return null;
  const { data, error } = await createAdminClient()
    .from("reservations")
    .select(
      "public_token, reference, branch_id, guest_name, guest_email, starts_at, party_size, seating, occasion, notes, status, cancelled_by, cancel_reason, locale",
    )
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw new Error(`Failed to load booking: ${error.message}`);
  if (!data) return null;
  const booking = reservationRow.parse(data);
  const { reservations: rules } = await getBrand();
  return {
    ...booking,
    canCancel:
      booking.status === "confirmed" &&
      new Date(booking.starts_at).getTime() > Date.now() + rules.cancelUntilMinutes * 60_000,
  };
}

export async function cancelReservation(token: string): Promise<boolean> {
  if (!TOKEN.test(token) || !orderingEnabled()) return false;
  const { reservations: rules } = await getBrand();
  const { data, error } = await createAdminClient().rpc("cancel_reservation_by_guest", {
    booking_token: token,
    notice_minutes: rules.cancelUntilMinutes,
  });
  if (error) {
    console.error("[booking] cancel failed", error.code, error.message);
    return false;
  }
  if (data === true) {
    after(() =>
      sendReservationEmail(token, "cancelled").catch((e) =>
        console.error("[booking] email failed", e),
      ),
    );
  }
  return data === true;
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

export async function sendReservationEmail(
  token: string,
  kind: "confirmed" | "cancelled",
): Promise<void> {
  const booking = await getReservationByToken(token);
  if (!booking?.guest_email) return;
  const locale = booking.locale;
  const [brand, messages, branches] = await Promise.all([
    getBrand(),
    loadMessages(locale),
    getBranches(locale),
  ]);
  const branch = branches.find((b) => b.id === booking.branch_id);
  const t = createTranslator({ locale, messages, namespace: "BookingEmail" });
  const when = new Intl.DateTimeFormat(`${locale}-LK`, {
    timeZone: "Asia/Colombo",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(booking.starts_at));

  await sendEmail({
    to: booking.guest_email,
    subject: t(`${kind}.subject`, { brand: brand.name, reference: booking.reference }),
    react: NoticeEmail({
      brand,
      lang: locale,
      url: `${publicEnv.siteUrl}${reservationPath(booking.public_token, locale)}`,
      text: {
        preview: t(`${kind}.preview`, { when }),
        heading: t(`${kind}.heading`, { name: booking.guest_name }),
        intro: t(`${kind}.intro`, { branch: branch?.name ?? "" }),
        rows: [
          { label: t("reference"), value: booking.reference },
          { label: t("when"), value: when },
          { label: t("guests"), value: String(booking.party_size) },
          {
            label: t("where"),
            value: branch ? `${branch.name}, ${branch.addressLine}, ${branch.city}` : "",
          },
        ],
        note: kind === "confirmed" ? t("confirmed.note") : undefined,
        button: t("manage"),
        footer: t("footer", {
          brand: brand.name,
          phone: branch ? formatPhone(branch.phone) : formatPhone(brand.contact.phone),
        }),
      },
    }),
  });
}
