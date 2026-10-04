import { randomBytes, randomUUID } from "node:crypto";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const CUSTOMER = "00000000-0000-4000-8000-0000000000c1";
const NUGEGODA_STAFF = "00000000-0000-4000-8000-0000000000d1";
const KANDY_STAFF = "00000000-0000-4000-8000-0000000000d2";
const ADMIN = "00000000-0000-4000-8000-0000000000a1";

const nugegoda = seed.stableId("branch", "nugegoda");
const kandy = seed.stableId("branch", "kandy");
const kottu200 = seed.stableId("promo-code", "KOTTU200");

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, CUSTOMER);
  await createUser(db, NUGEGODA_STAFF, { role: "staff", branchSlug: "nugegoda" });
  await createUser(db, KANDY_STAFF, { role: "staff", branchSlug: "kandy" });
  await createUser(db, ADMIN, { role: "admin" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const TOTAL = 3300_00 + 330_00 + 653_40;

async function placeOrder(overrides: Record<string, unknown> = {}): Promise<string> {
  const payload = {
    public_token: randomBytes(24).toString("base64url"),
    order_number: randomBytes(3)
      .toString("hex")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "A"),
    branch_id: nugegoda,
    customer_name: "Nimal Perera",
    customer_phone: "+94771234567",
    type: "pickup",
    subtotal_cents: 3300_00,
    discount_cents: 0,
    service_charge_cents: 330_00,
    vat_cents: 653_40,
    delivery_fee_cents: 0,
    total_cents: TOTAL,
    payment_method: "cod",
    idempotency_key: randomUUID(),
    locale: "en",
    items: [
      {
        menu_item_id: seed.stableId("menu-item", "chicken-kottu"),
        name_i18n: { en: "Chicken kottu" },
        unit_price_cents: 1650_00,
        quantity: 2,
        options: [],
        line_total_cents: 3300_00,
        sort_order: 0,
      },
    ],
    ...overrides,
  };
  await db.exec("set role service_role");
  try {
    const { rows } = await db.query<{ order_id: string }>("select * from public.place_order($1)", [
      JSON.stringify(payload),
    ]);
    return rows[0]!.order_id;
  } finally {
    await db.exec("reset role");
  }
}

/** Calls update_order_status as a signed-in user and keeps the change. */
async function moveAs(user: string, orderId: string, next: string, reason: string | null = null) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role authenticated");
  try {
    const { rows } = await db.query<{ status: string }>(
      "select public.update_order_status($1, $2, $3) as status",
      [orderId, next, reason],
    );
    return rows[0]!.status;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const statusOf = async (id: string) =>
  (
    await db.query<{ status: string; payment_status: string; rejection_reason: string | null }>(
      "select status, payment_status, rejection_reason from public.orders where id = $1",
      [id],
    )
  ).rows[0]!;

describe("update_order_status()", () => {
  it("lets branch staff move their own orders along, recording who did it", async () => {
    const id = await placeOrder();
    await moveAs(NUGEGODA_STAFF, id, "accepted");
    await moveAs(NUGEGODA_STAFF, id, "preparing");
    await moveAs(NUGEGODA_STAFF, id, "ready");
    await moveAs(NUGEGODA_STAFF, id, "completed");
    // Cash is collected at handover.
    expect(await statusOf(id)).toMatchObject({ status: "completed", payment_status: "paid" });
    const { rows } = await db.query<{ status: string; actor_id: string | null }>(
      "select status, actor_id from public.order_status_events where order_id = $1 and status = 'accepted'",
      [id],
    );
    expect(rows).toEqual([{ status: "accepted", actor_id: NUGEGODA_STAFF }]);
  });

  it("refuses staff of another branch and customers", async () => {
    const id = await placeOrder({ user_id: CUSTOMER });
    await expect(moveAs(KANDY_STAFF, id, "accepted")).rejects.toThrow(/not_allowed/);
    await expect(moveAs(CUSTOMER, id, "accepted")).rejects.toThrow(/not_allowed/);
    expect((await statusOf(id)).status).toBe("received");
  });

  it("lets admins act for any branch", async () => {
    const id = await placeOrder({ branch_id: kandy });
    expect(await moveAs(ADMIN, id, "accepted")).toBe("accepted");
  });

  it("only allows the next steps for the order type", async () => {
    const pickup = await placeOrder();
    await expect(moveAs(NUGEGODA_STAFF, pickup, "completed")).rejects.toThrow(/invalid_transition/);
    await moveAs(NUGEGODA_STAFF, pickup, "accepted");
    await expect(moveAs(NUGEGODA_STAFF, pickup, "out_for_delivery")).rejects.toThrow(
      /invalid_transition/,
    );
    await expect(moveAs(NUGEGODA_STAFF, pickup, "received")).rejects.toThrow(/invalid_transition/);
  });

  it("needs a reason to reject, shows it to the customer and gives the promo code back", async () => {
    const id = await placeOrder({
      promo_code_id: kottu200,
      discount_cents: 200_00,
      total_cents: TOTAL - 200_00,
    });
    await expect(moveAs(NUGEGODA_STAFF, id, "rejected", "  ")).rejects.toThrow(/reason_required/);
    await moveAs(NUGEGODA_STAFF, id, "rejected", "An item is sold out");
    expect(await statusOf(id)).toMatchObject({
      status: "rejected",
      rejection_reason: "An item is sold out",
    });
    const { rows } = await db.query("select 1 from public.promo_redemptions where order_id = $1", [
      id,
    ]);
    expect(rows).toEqual([]);
  });

  it("isn't open to the public API role", async () => {
    const id = await placeOrder();
    await asRole(db, "anon", null, async (tx) => {
      await expect(
        tx.query("select public.update_order_status($1, 'accepted')", [id]),
      ).rejects.toThrow(/permission denied/);
    });
  });
});

describe("branch controls", () => {
  it("lets staff pause online orders for their own branch only", async () => {
    await asRole(db, "authenticated", NUGEGODA_STAFF, async (tx) => {
      await tx.query("select public.set_branch_accepting_orders($1, false)", [nugegoda]);
      const { rows } = await tx.query<{ is_accepting_orders: boolean }>(
        "select is_accepting_orders from public.branches where id = $1",
        [nugegoda],
      );
      expect(rows).toEqual([{ is_accepting_orders: false }]);
      await expect(
        tx.query("select public.set_branch_accepting_orders($1, false)", [kandy]),
      ).rejects.toThrow(/not_allowed/);
    });
  });

  it("keeps branch secrets away from every API role, staff included", async () => {
    for (const [role, user] of [
      ["anon", null],
      ["authenticated", NUGEGODA_STAFF],
      ["authenticated", ADMIN],
    ] as const) {
      await asRole(db, role, user, async (tx) => {
        await expect(tx.query("select * from public.branch_secrets")).rejects.toThrow(
          /permission denied/,
        );
      });
    }
  });

  it("broadcasts order changes on the branch's secret topic, without personal data", async () => {
    const id = await placeOrder();
    const { rows: keys } = await db.query<{ realtime_key: string }>(
      "select realtime_key from public.branch_secrets where branch_id = $1",
      [nugegoda],
    );
    expect(keys[0]!.realtime_key).toMatch(/^[0-9a-f]{64}$/);
    const { rows } = await db.query<{ payload: Record<string, unknown> }>(
      "select payload from realtime.sent where topic = $1 and payload->>'orderId' = $2",
      [`staff:${keys[0]!.realtime_key}`, id],
    );
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!.payload).sort()).toEqual(["orderId", "paymentStatus", "status"]);
  });
});

describe("auto_reject_unaccepted_orders()", () => {
  const run = async () => {
    await db.exec("set role service_role");
    try {
      return (await db.query<{ n: number }>("select public.auto_reject_unaccepted_orders() as n"))
        .rows[0]!.n;
    } finally {
      await db.exec("reset role");
    }
  };
  const age = (id: string, minutes: number) =>
    db.query(
      `update public.order_status_events set created_at = now() - make_interval(mins => $2)
       where order_id = $1 and status = 'received'`,
      [id, minutes],
    );

  it("rejects orders nobody accepted in time, and leaves the rest", async () => {
    const stale = await placeOrder();
    const fresh = await placeOrder();
    const accepted = await placeOrder();
    await moveAs(NUGEGODA_STAFF, accepted, "accepted");
    await Promise.all([age(stale, 11), age(fresh, 2), age(accepted, 30)]);

    expect(await run()).toBeGreaterThanOrEqual(1);
    expect(await statusOf(stale)).toMatchObject({
      status: "rejected",
      rejection_reason: "The branch didn't confirm the order in time.",
    });
    expect((await statusOf(fresh)).status).toBe("received");
    expect((await statusOf(accepted)).status).toBe("accepted");
  });

  it("rejects a scheduled order only when its time is near", async () => {
    const later = await placeOrder({
      scheduled_for: new Date(Date.now() + 3 * 3600_000).toISOString(),
    });
    const soon = await placeOrder({
      scheduled_for: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    await Promise.all([age(later, 60), age(soon, 60)]);
    await run();
    expect((await statusOf(later)).status).toBe("received");
    expect((await statusOf(soon)).status).toBe("rejected");
  });

  it("follows the setting, and 0 turns it off", async () => {
    const id = await placeOrder();
    await age(id, 30);
    await db.query(
      `update public.settings set brand = '{"orders": {"autoRejectMinutes": 0}}' where id = 1`,
    );
    try {
      expect(await run()).toBe(0);
      expect((await statusOf(id)).status).toBe("received");
    } finally {
      await db.query("update public.settings set brand = '{}' where id = 1");
    }
  });
});

describe("push subscriptions", () => {
  const subscribe = (tx: Parameters<Parameters<typeof asRole>[3]>[0], user: string) =>
    tx.query(
      "insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)",
      [user, `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, "B".repeat(87), "a".repeat(22)],
    );

  it("are for staff, each managing only their own", async () => {
    await asRole(db, "authenticated", NUGEGODA_STAFF, async (tx) => {
      await subscribe(tx, NUGEGODA_STAFF);
      await expect(subscribe(tx, KANDY_STAFF)).rejects.toThrow(/row-level security/);
    });
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      await expect(subscribe(tx, CUSTOMER)).rejects.toThrow(/row-level security/);
    });
  });
});
