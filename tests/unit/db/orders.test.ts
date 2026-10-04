import { randomBytes, randomUUID } from "node:crypto";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const CUSTOMER = "00000000-0000-4000-8000-0000000000c1";
const OTHER_CUSTOMER = "00000000-0000-4000-8000-0000000000c2";
const NUGEGODA_STAFF = "00000000-0000-4000-8000-0000000000d1";
const KANDY_STAFF = "00000000-0000-4000-8000-0000000000d2";

const branchId = (slug: string) => seed.stableId("branch", slug);
const kottu = seed.stableId("menu-item", "chicken-kottu");

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, CUSTOMER);
  await createUser(db, OTHER_CUSTOMER);
  await createUser(db, NUGEGODA_STAFF, { role: "staff", branchSlug: "nugegoda" });
  await createUser(db, KANDY_STAFF, { role: "staff", branchSlug: "kandy" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

/** A valid pickup order payload, as src/lib/orders/service.ts builds it. */
function payload(overrides: Record<string, unknown> = {}) {
  const subtotal = 1650_00 * 2;
  const service = 330_00;
  const vat = 653_40;
  return {
    public_token: randomBytes(24).toString("base64url"),
    order_number: randomBytes(3)
      .toString("hex")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "A"),
    branch_id: branchId("nugegoda"),
    user_id: null,
    customer_name: "Nimal Perera",
    customer_phone: "+94771234567",
    customer_email: "nimal@example.com",
    type: "pickup",
    scheduled_for: null,
    notes: null,
    subtotal_cents: subtotal,
    discount_cents: 0,
    service_charge_cents: service,
    vat_cents: vat,
    delivery_fee_cents: 0,
    total_cents: subtotal + service + vat,
    promo_code_id: null,
    payment_method: "cod",
    idempotency_key: randomUUID(),
    locale: "en",
    items: [
      {
        menu_item_id: kottu,
        name_i18n: { en: "Chicken kottu" },
        unit_price_cents: 1650_00,
        quantity: 2,
        options: [],
        spice_level: "hot",
        instructions: null,
        line_total_cents: 3300_00,
        sort_order: 0,
      },
    ],
    ...overrides,
  };
}

type Placed = { order_id: string; public_token: string; order_number: string; created: boolean };

async function place(p: ReturnType<typeof payload>): Promise<Placed> {
  return asRole(db, "service_role", null, async (tx) => {
    const { rows } = await tx.query<Placed>("select * from public.place_order($1)", [
      JSON.stringify(p),
    ]);
    // asRole rolls back; commit by re-running outside for state-dependent tests.
    return rows[0]!;
  });
}

/** Like place(), but keeps the order (service_role, committed). */
async function placeCommitted(p: ReturnType<typeof payload>): Promise<Placed> {
  await db.exec("set role service_role");
  try {
    const { rows } = await db.query<Placed>("select * from public.place_order($1)", [
      JSON.stringify(p),
    ]);
    return rows[0]!;
  } finally {
    await db.exec("reset role");
  }
}

describe("place_order()", () => {
  it("creates the order, its items and the first status event", async () => {
    const p = payload();
    const result = await placeCommitted(p);
    expect(result.created).toBe(true);
    expect(result.public_token).toBe(p.public_token);

    const items = await db.query("select * from public.order_items where order_id = $1", [
      result.order_id,
    ]);
    expect(items.rows).toHaveLength(1);
    const events = await db.query<{ status: string }>(
      "select status from public.order_status_events where order_id = $1",
      [result.order_id],
    );
    expect(events.rows).toEqual([{ status: "received" }]);
  });

  it("returns the existing order for a retried request instead of creating another", async () => {
    const p = payload();
    const first = await placeCommitted(p);
    const retry = await placeCommitted({
      ...p,
      public_token: randomBytes(24).toString("base64url"),
    });
    expect(retry).toEqual({ ...first, created: false });
    const count = await db.query<{ n: number }>(
      "select count(*)::int as n from public.orders where idempotency_key = $1",
      [p.idempotency_key],
    );
    expect(count.rows[0]!.n).toBe(1);
  });

  it("refuses totals that don't add up", async () => {
    await expect(place(payload({ total_cents: 1 }))).rejects.toThrow(/totals_add_up/);
  });

  it("refuses an order with no items", async () => {
    await expect(place(payload({ items: [] }))).rejects.toThrow(/order_has_no_items/);
  });

  it("refuses a delivery order without an address", async () => {
    await expect(place(payload({ type: "delivery" }))).rejects.toThrow(
      /delivery_orders_have_an_address/,
    );
  });

  it("enforces a promo code's redemption limit", async () => {
    const promoId = seed.stableId("promo-code", "KOTTU200");
    await db.query("update public.promo_codes set max_redemptions = 1 where id = $1", [promoId]);
    try {
      const withPromo = () =>
        payload({
          promo_code_id: promoId,
          discount_cents: 200_00,
          total_cents: 3300_00 - 200_00 + 330_00 + 653_40,
        });
      await placeCommitted(withPromo());
      await expect(placeCommitted(withPromo())).rejects.toThrow(/promo_exhausted/);
    } finally {
      await db.query("update public.promo_codes set max_redemptions = null where id = $1", [
        promoId,
      ]);
    }
  });

  it("can't be called with the public or signed-in API roles", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await asRole(db, role, role === "authenticated" ? CUSTOMER : null, async (tx) => {
        await expect(
          tx.query("select * from public.place_order($1)", [JSON.stringify(payload())]),
        ).rejects.toThrow(/permission denied/);
      });
    }
  });
});

describe("order visibility", () => {
  let nugegodaOrder: Placed;
  let kandyOrder: Placed;

  beforeAll(async () => {
    nugegodaOrder = await placeCommitted(payload({ user_id: CUSTOMER }));
    kandyOrder = await placeCommitted(
      payload({ branch_id: branchId("kandy"), user_id: OTHER_CUSTOMER }),
    );
  });

  const visibleIds = async (role: "anon" | "authenticated", user: string | null) =>
    asRole(db, role, user, async (tx) => {
      const { rows } = await tx.query<{ id: string }>("select id from public.orders");
      return rows.map((r) => r.id);
    });

  it("hides every order from the public API", async () => {
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("select * from public.orders")).rejects.toThrow(/permission denied/);
    });
  });

  it("shows customers only their own orders", async () => {
    const ids = await visibleIds("authenticated", CUSTOMER);
    expect(ids).toContain(nugegodaOrder.order_id);
    expect(ids).not.toContain(kandyOrder.order_id);
  });

  it("shows branch staff only their branch's orders", async () => {
    const nugegoda = await visibleIds("authenticated", NUGEGODA_STAFF);
    expect(nugegoda).toContain(nugegodaOrder.order_id);
    expect(nugegoda).not.toContain(kandyOrder.order_id);
    const kandy = await visibleIds("authenticated", KANDY_STAFF);
    expect(kandy).toEqual(expect.arrayContaining([kandyOrder.order_id]));
    expect(kandy).not.toContain(nugegodaOrder.order_id);
  });

  it("doesn't let customers change an order", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      await expect(
        tx.query("update public.orders set total_cents = 0 where id = $1", [
          nugegodaOrder.order_id,
        ]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("keeps promo codes out of the public API", async () => {
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("select code from public.promo_codes")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

describe("status changes", () => {
  it("are recorded and broadcast on the order's own topic, without personal data", async () => {
    const order = await placeCommitted(payload());
    await db.query("update public.orders set status = 'accepted' where id = $1", [order.order_id]);

    const events = await db.query<{ status: string }>(
      "select status from public.order_status_events where order_id = $1 order by created_at",
      [order.order_id],
    );
    expect(events.rows.map((e) => e.status)).toEqual(["received", "accepted"]);

    const sent = await db.query<{
      topic: string;
      event: string;
      payload: Record<string, unknown>;
      private: boolean;
    }>("select topic, event, payload, private from realtime.sent where topic = $1 order by id", [
      `order:${order.public_token}`,
    ]);
    expect(sent.rows.map((m) => m.payload.status)).toEqual(["received", "accepted"]);
    expect(sent.rows[1]).toMatchObject({ event: "status", private: false });
    expect(Object.keys(sent.rows[1]!.payload).sort()).toEqual([
      "paymentStatus",
      "status",
      "updatedAt",
    ]);
  });

  it("record the rejection reason", async () => {
    const order = await placeCommitted(payload());
    await db.query(
      "update public.orders set status = 'rejected', rejection_reason = 'Kitchen closed early' where id = $1",
      [order.order_id],
    );
    const { rows } = await db.query<{ reason: string }>(
      "select reason from public.order_status_events where order_id = $1 and status = 'rejected'",
      [order.order_id],
    );
    expect(rows).toEqual([{ reason: "Kitchen closed early" }]);
  });
});
