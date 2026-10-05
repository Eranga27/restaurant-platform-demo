import { randomBytes, randomUUID } from "node:crypto";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const GUEST = "00000000-0000-4000-8000-0000000000c1";
const OTHER_GUEST = "00000000-0000-4000-8000-0000000000c2";
const NUGEGODA_STAFF = "00000000-0000-4000-8000-0000000000d1";
const NUGEGODA_MANAGER = "00000000-0000-4000-8000-0000000000e1";
const KANDY_MANAGER = "00000000-0000-4000-8000-0000000000e2";
const ADMIN = "00000000-0000-4000-8000-0000000000a1";

const nugegoda = seed.stableId("branch", "nugegoda");

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, GUEST);
  await createUser(db, OTHER_GUEST);
  await createUser(db, NUGEGODA_STAFF, { role: "staff", branchSlug: "nugegoda" });
  await createUser(db, NUGEGODA_MANAGER, { role: "manager", branchSlug: "nugegoda" });
  await createUser(db, KANDY_MANAGER, { role: "manager", branchSlug: "kandy" });
  await createUser(db, ADMIN, { role: "admin" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const token = () => randomBytes(24).toString("base64url");
const reference = () =>
  randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "A");

async function asService<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec("set role service_role");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

/** Runs SQL as a signed-in user and keeps the result. */
async function asUser<T>(user: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

/** A booking at Nugegoda some days ahead, 90 minutes long. */
function booking(startsAt: string, partySize: number, overrides: Record<string, unknown> = {}) {
  const start = new Date(startsAt);
  return {
    public_token: token(),
    reference: reference(),
    branch_id: nugegoda,
    user_id: null,
    guest_name: "Nimal Perera",
    guest_phone: "+94771234567",
    guest_email: "nimal@example.com",
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + 90 * 60_000).toISOString(),
    party_size: partySize,
    seating: "any",
    idempotency_key: randomUUID(),
    locale: "en",
    seats_limit: 12,
    ...overrides,
  };
}

const book = async (payload: ReturnType<typeof booking>) =>
  (
    await asService<{ reservation_id: string; public_token: string; created: boolean }>(
      "select * from public.book_table($1)",
      [JSON.stringify(payload)],
    )
  )[0]!;

describe("book_table()", () => {
  it("books while there are seats and refuses the party that wouldn't fit", async () => {
    await book(booking("2030-01-07T19:00:00+05:30", 8));
    await book(booking("2030-01-07T19:30:00+05:30", 4)); // 12 of 12
    await expect(book(booking("2030-01-07T20:00:00+05:30", 1))).rejects.toThrow(/fully_booked/);
    // After the first party leaves (20:30) there's room again.
    await book(booking("2030-01-07T20:30:00+05:30", 6));
  });

  it("only counts bookings that overlap, at their busiest moment", async () => {
    await book(booking("2030-01-08T12:00:00+05:30", 10));
    await book(booking("2030-01-08T13:30:00+05:30", 10));
    // 12:45 to 14:15 overlaps both, but never both at once: 10 + 2 fits.
    await book(booking("2030-01-08T12:45:00+05:30", 2));
  });

  it("frees the seats of cancelled bookings", async () => {
    const first = await book(booking("2030-01-09T19:00:00+05:30", 12));
    await expect(book(booking("2030-01-09T19:00:00+05:30", 2))).rejects.toThrow(/fully_booked/);
    await asService("select public.cancel_reservation_by_guest($1, 120)", [first.public_token]);
    await book(booking("2030-01-09T19:00:00+05:30", 2));
  });

  it("returns the first booking for a retried request", async () => {
    const payload = booking("2030-01-10T19:00:00+05:30", 2);
    const first = await book(payload);
    const retry = await book({ ...payload, public_token: token(), reference: reference() });
    expect(retry).toMatchObject({ reservation_id: first.reservation_id, created: false });
  });

  it("can't be called with the public or signed-in API roles", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await asRole(db, role, role === "authenticated" ? GUEST : null, async (tx) => {
        await expect(
          tx.query("select * from public.book_table($1)", [
            JSON.stringify(booking("2030-01-11T19:00:00+05:30", 2)),
          ]),
        ).rejects.toThrow(/permission denied/);
      });
    }
  });
});

describe("cancelling and changing bookings", () => {
  it("lets guests cancel until the notice period, and not after", async () => {
    const later = await book(booking(new Date(Date.now() + 5 * 3600_000).toISOString(), 2));
    const soon = await book(booking(new Date(Date.now() + 60 * 60_000).toISOString(), 2));
    const cancel = async (t: string) =>
      (
        await asService<{ ok: boolean }>(
          "select public.cancel_reservation_by_guest($1, 120) as ok",
          [t],
        )
      )[0]!.ok;
    expect(await cancel(later.public_token)).toBe(true);
    expect(await cancel(later.public_token)).toBe(false); // already cancelled
    expect(await cancel(soon.public_token)).toBe(false);
  });

  it("lets branch staff seat and finish bookings at their branch only", async () => {
    const { reservation_id: id } = await book(booking("2030-02-01T19:00:00+05:30", 2));
    const move = (user: string, next: string, reason: string | null = null) =>
      asUser(user, "select public.update_reservation_status($1, $2, $3)", [id, next, reason]);
    await expect(move(KANDY_MANAGER, "seated")).rejects.toThrow(/not_allowed/);
    await expect(move(GUEST, "seated")).rejects.toThrow(/not_allowed/);
    await expect(move(NUGEGODA_STAFF, "completed")).rejects.toThrow(/invalid_transition/);
    await move(NUGEGODA_STAFF, "seated");
    await move(NUGEGODA_STAFF, "completed");
  });

  it("needs a reason for the branch to cancel", async () => {
    const { reservation_id: id } = await book(booking("2030-02-02T19:00:00+05:30", 2));
    await expect(
      asUser(NUGEGODA_STAFF, "select public.update_reservation_status($1, 'cancelled')", [id]),
    ).rejects.toThrow(/reason_required/);
    await asUser(
      NUGEGODA_STAFF,
      "select public.update_reservation_status($1, 'cancelled', 'Private event')",
      [id],
    );
    const { rows } = await db.query(
      "select cancelled_by, cancel_reason from public.reservations where id = $1",
      [id],
    );
    expect(rows).toEqual([{ cancelled_by: "branch", cancel_reason: "Private event" }]);
  });

  it("shows guests their own bookings and staff their branch's", async () => {
    const mine = await book(booking("2030-02-03T19:00:00+05:30", 2, { user_id: GUEST }));
    const ids = async (user: string) =>
      (await asUser<{ id: string }>(user, "select id from public.reservations")).map((r) => r.id);
    expect(await ids(GUEST)).toEqual([mine.reservation_id]);
    expect(await ids(OTHER_GUEST)).toEqual([]);
    expect(await ids(NUGEGODA_STAFF)).toContain(mine.reservation_id);
    expect(await ids(KANDY_MANAGER)).not.toContain(mine.reservation_id);
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("select * from public.reservations")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Event enquiries
// ---------------------------------------------------------------------------

async function enquire(overrides: Record<string, unknown> = {}) {
  const payload = {
    public_token: token(),
    reference: reference(),
    branch_id: nugegoda,
    contact_name: "Kumari de Silva",
    contact_phone: "+94771234567",
    contact_email: "kumari@example.com",
    event_type: "dana",
    service: "at_branch",
    event_date: "2030-03-01",
    guests: 40,
    idempotency_key: randomUUID(),
    locale: "en",
    ...overrides,
  };
  const [row] = await asService<{ inquiry_id: string; public_token: string }>(
    "select * from public.create_event_inquiry($1)",
    [JSON.stringify(payload)],
  );
  return { id: row!.inquiry_id, token: row!.public_token };
}

const quote = (user: string, id: string, total: number, deposit: number) =>
  asUser(user, "select public.quote_event_inquiry($1, $2, $3, 'Rice and seven curries')", [
    id,
    total,
    deposit,
  ]);

const inquiry = async (id: string) =>
  (
    await db.query<{ status: string; deposit_status: string; accepted_at: string | null }>(
      "select status, deposit_status, accepted_at from public.event_inquiries where id = $1",
      [id],
    )
  ).rows[0]!;

const respond = async (t: string, accept: boolean) =>
  (
    await asService<{ status: string }>("select public.respond_to_quote($1, $2) as status", [
      t,
      accept,
    ])
  )[0]!.status;

describe("event enquiries", () => {
  it("need a venue for catering", async () => {
    await expect(enquire({ service: "catering" })).rejects.toThrow(/catering_has_a_venue/);
    await enquire({ service: "catering", venue: "12 Temple Road, Maharagama" });
  });

  it("are quoted by the branch's managers and admins, not staff or other branches", async () => {
    const { id } = await enquire();
    await expect(quote(NUGEGODA_STAFF, id, 72000_00, 0)).rejects.toThrow(/not_allowed/);
    await expect(quote(KANDY_MANAGER, id, 72000_00, 0)).rejects.toThrow(/not_allowed/);
    await expect(quote(NUGEGODA_MANAGER, id, 72000_00, 80000_00)).rejects.toThrow(/invalid_quote/);
    await quote(NUGEGODA_MANAGER, id, 72000_00, 0);
    await quote(ADMIN, id, 70000_00, 0); // revised
    expect((await inquiry(id)).status).toBe("quoted");
  });

  it("are confirmed when the guest accepts a quote without a deposit", async () => {
    const { id, token: t } = await enquire();
    await quote(NUGEGODA_MANAGER, id, 72000_00, 0);
    expect(await respond(t, true)).toBe("confirmed");
    await expect(respond(t, true)).rejects.toThrow(/quote_not_open/);
  });

  it("wait for the deposit after accepting, and a revised quote needs accepting again", async () => {
    const { id, token: t } = await enquire();
    await quote(NUGEGODA_MANAGER, id, 72000_00, 18000_00);
    await expect(asService("select * from public.start_deposit_payment($1)", [t])).rejects.toThrow(
      /deposit_not_due/,
    ); // not accepted yet
    expect(await respond(t, true)).toBe("quoted");
    expect((await inquiry(id)).accepted_at).not.toBeNull();
    await quote(NUGEGODA_MANAGER, id, 75000_00, 18000_00);
    expect((await inquiry(id)).accepted_at).toBeNull();
  });

  it("are confirmed by a paid deposit", async () => {
    const { id, token: t } = await enquire();
    await quote(NUGEGODA_MANAGER, id, 72000_00, 18000_00);
    await respond(t, true);
    const [attempt] = await asService<{ reference: string; amount_cents: number }>(
      "select * from public.start_deposit_payment($1)",
      [t],
    );
    expect(attempt!.amount_cents).toBe(18000_00);
    const [result] = await asService<{
      outcome: string;
      kind: string;
      status: string;
      payment_status: string;
    }>("select * from public.apply_payhere_notification($1)", [
      JSON.stringify({
        reference: attempt!.reference,
        amount_cents: 18000_00,
        currency: "LKR",
        status_code: 2,
        raw: {},
      }),
    ]);
    expect(result).toMatchObject({
      outcome: "applied",
      kind: "deposit",
      status: "confirmed",
      payment_status: "paid",
    });
    expect(await inquiry(id)).toMatchObject({ status: "confirmed", deposit_status: "paid" });
  });

  it("can be declined by the guest, or by the branch with a reason", async () => {
    const guestDeclines = await enquire();
    await quote(NUGEGODA_MANAGER, guestDeclines.id, 72000_00, 0);
    expect(await respond(guestDeclines.token, false)).toBe("cancelled");

    const branchDeclines = await enquire();
    const decline = (reason: string | null) =>
      asUser(NUGEGODA_MANAGER, "select public.set_event_status($1, 'declined', $2)", [
        branchDeclines.id,
        reason,
      ]);
    await expect(decline(null)).rejects.toThrow(/reason_required/);
    await decline("Fully booked that weekend");
    expect((await inquiry(branchDeclines.id)).status).toBe("declined");
  });

  it("are visible to the guest and the branch team only", async () => {
    const mine = await enquire({ user_id: GUEST });
    const ids = async (user: string) =>
      (await asUser<{ id: string }>(user, "select id from public.event_inquiries")).map(
        (r) => r.id,
      );
    expect(await ids(GUEST)).toEqual([mine.id]);
    expect(await ids(OTHER_GUEST)).toEqual([]);
    expect(await ids(NUGEGODA_STAFF)).toContain(mine.id);
    expect(await ids(KANDY_MANAGER)).not.toContain(mine.id);
  });
});
