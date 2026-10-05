import { randomBytes, randomUUID } from "node:crypto";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const CUSTOMER = "00000000-0000-4000-8000-0000000000c1";

const kottu = seed.stableId("menu-item", "chicken-kottu");
const kottu200 = seed.stableId("promo-code", "KOTTU200");

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, ADMIN, { role: "admin" });
  await createUser(db, CUSTOMER);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const TOTAL = 3300_00 + 330_00 + 653_40;

function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    public_token: randomBytes(24).toString("base64url"),
    order_number: randomBytes(3)
      .toString("hex")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "A"),
    branch_id: seed.stableId("branch", "colombo-07"),
    user_id: null,
    customer_name: "Nimal Perera",
    customer_phone: "+94771234567",
    customer_email: "nimal@example.com",
    type: "pickup",
    subtotal_cents: 3300_00,
    discount_cents: 0,
    service_charge_cents: 330_00,
    vat_cents: 653_40,
    delivery_fee_cents: 0,
    total_cents: TOTAL,
    promo_code_id: null,
    payment_method: "payhere",
    idempotency_key: randomUUID(),
    locale: "en",
    items: [
      {
        menu_item_id: kottu,
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
}

/** Runs SQL as the secret key's role and keeps the result. */
async function asService<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec("set role service_role");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

type Order = { token: string; number: string; id: string };

async function placeOrder(overrides: Record<string, unknown> = {}): Promise<Order> {
  const p = orderPayload(overrides);
  const [row] = await asService<{ order_id: string }>("select * from public.place_order($1)", [
    JSON.stringify(p),
  ]);
  return { token: p.public_token, number: p.order_number, id: row!.order_id };
}

async function startPayment(token: string) {
  const [row] = await asService<{ payment_id: string; reference: string; amount_cents: number }>(
    "select * from public.start_payment($1)",
    [token],
  );
  return row!;
}

type Applied = {
  outcome: string;
  order_token: string | null;
  payment_status: string | null;
  order_status: string | null;
};

async function notify(
  reference: string,
  statusCode: number,
  overrides: Record<string, unknown> = {},
): Promise<Applied> {
  const [row] = await asService<Applied>("select * from public.apply_payhere_notification($1)", [
    JSON.stringify({
      reference,
      payment_id: "320025071278",
      amount_cents: TOTAL,
      currency: "LKR",
      status_code: statusCode,
      method: "VISA",
      status_message: "Successfully completed the payment.",
      raw: { order_id: reference, status_code: String(statusCode) },
      ...overrides,
    }),
  ]);
  return row!;
}

async function orderState(id: string) {
  const { rows } = await db.query<{
    status: string;
    payment_status: string;
    payment_method: string;
  }>("select status, payment_status, payment_method from public.orders where id = $1", [id]);
  return rows[0]!;
}

describe("orders paid online", () => {
  it("wait for payment, while cash orders go straight to the branch", async () => {
    const online = await placeOrder();
    const cash = await placeOrder({ payment_method: "cod" });
    expect(await orderState(online.id)).toMatchObject({
      status: "awaiting_payment",
      payment_status: "pending",
    });
    expect(await orderState(cash.id)).toMatchObject({ status: "received" });
  });

  it("can't be inserted as already paid or accepted", async () => {
    const p = orderPayload();
    const [row] = await asService<{ status: string; payment_status: string }>(
      `insert into public.orders (
         public_token, order_number, branch_id, customer_name, customer_phone, type,
         subtotal_cents, service_charge_cents, vat_cents, total_cents, payment_method,
         idempotency_key, status, payment_status
       ) values ($1, $2, $3, 'Test', '+94771234567', 'pickup', 100, 10, 20, 130, 'payhere', $4, 'accepted', 'paid')
       returning status, payment_status`,
      [p.public_token, p.order_number, p.branch_id, p.idempotency_key],
    );
    expect(row).toEqual({ status: "awaiting_payment", payment_status: "pending" });
  });
});

describe("start_payment()", () => {
  it("opens numbered attempts for the stored order total", async () => {
    const order = await placeOrder();
    const first = await startPayment(order.token);
    const second = await startPayment(order.token);
    expect(first).toMatchObject({ reference: `${order.number}-1`, amount_cents: TOTAL });
    expect(second.reference).toBe(`${order.number}-2`);
  });

  it("refuses orders that don't need paying", async () => {
    const cash = await placeOrder({ payment_method: "cod" });
    await expect(startPayment(cash.token)).rejects.toThrow(/payment_not_needed/);
    await expect(startPayment("x".repeat(32))).rejects.toThrow(/order_not_found/);
  });

  it("stops after 10 attempts", async () => {
    const order = await placeOrder();
    for (let i = 0; i < 10; i++) await startPayment(order.token);
    await expect(startPayment(order.token)).rejects.toThrow(/payment_attempts_exhausted/);
  });
});

describe("apply_payhere_notification()", () => {
  it("marks the order paid and sends it to the branch", async () => {
    const order = await placeOrder();
    const { reference } = await startPayment(order.token);

    expect(await notify(reference, 2)).toEqual({
      outcome: "applied",
      order_token: order.token,
      payment_status: "paid",
      order_status: "received",
    });
    const { rows: payments } = await db.query<{ status: string; verified: boolean }>(
      "select status, verified from public.payments where reference = $1",
      [reference],
    );
    expect(payments).toEqual([{ status: "paid", verified: true }]);
    const { rows: events } = await db.query<{ status: string }>(
      "select status from public.order_status_events where order_id = $1 order by created_at, status",
      [order.id],
    );
    expect(events.map((e) => e.status).sort()).toEqual(["awaiting_payment", "received"]);
  });

  it("ignores a repeated notification", async () => {
    const order = await placeOrder();
    const { reference } = await startPayment(order.token);
    await notify(reference, 2);
    expect((await notify(reference, 2)).outcome).toBe("duplicate");
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from public.order_status_events where order_id = $1",
      [order.id],
    );
    expect(rows[0]!.n).toBe(2);
  });

  it("refuses an amount or currency that doesn't match the order", async () => {
    const order = await placeOrder();
    const { reference } = await startPayment(order.token);
    expect((await notify(reference, 2, { amount_cents: 1_00 })).outcome).toBe("amount_mismatch");
    expect((await notify(reference, 2, { currency: "USD" })).outcome).toBe("amount_mismatch");
    expect(await orderState(order.id)).toMatchObject({
      status: "awaiting_payment",
      payment_status: "pending",
    });
  });

  it("lets the customer retry after a failed payment", async () => {
    const order = await placeOrder();
    const first = await startPayment(order.token);
    await notify(first.reference, -2, { status_message: "Insufficient funds" });
    expect(await orderState(order.id)).toMatchObject({
      status: "awaiting_payment",
      payment_status: "failed",
    });

    const second = await startPayment(order.token);
    expect((await orderState(order.id)).payment_status).toBe("pending");
    await notify(second.reference, 2);
    expect(await orderState(order.id)).toMatchObject({
      status: "received",
      payment_status: "paid",
    });
  });

  it("can't be undone by a late failure, but records a chargeback", async () => {
    const order = await placeOrder();
    const { reference } = await startPayment(order.token);
    await notify(reference, 2);
    expect((await notify(reference, -2)).outcome).toBe("ignored");
    expect((await orderState(order.id)).payment_status).toBe("paid");

    expect((await notify(reference, -3)).outcome).toBe("applied");
    expect((await orderState(order.id)).payment_status).toBe("charged_back");
  });

  it("flags a payment for an order that was already cancelled", async () => {
    const order = await placeOrder();
    const { reference } = await startPayment(order.token);
    await db.query("update public.orders set status = 'cancelled' where id = $1", [order.id]);
    expect((await notify(reference, 2)).outcome).toBe("paid_after_cancel");
    expect(await orderState(order.id)).toMatchObject({
      status: "cancelled",
      payment_status: "paid",
    });
  });

  it("records notifications for payments it doesn't know", async () => {
    expect((await notify("ZZZZZZ-1", 2)).outcome).toBe("unknown_reference");
    const { rows } = await db.query<{ outcome: string }>(
      "select outcome from public.payment_notifications where reference = 'ZZZZZZ-1'",
    );
    expect(rows).toEqual([{ outcome: "unknown_reference" }]);
  });
});

describe("pay_on_delivery_instead()", () => {
  const switchToCash = async (token: string) =>
    (
      await asService<{ switched: boolean }>(
        "select public.pay_on_delivery_instead($1) as switched",
        [token],
      )
    )[0]!.switched;

  it("sends an unpaid order to the branch as cash on delivery", async () => {
    const order = await placeOrder();
    expect(await switchToCash(order.token)).toBe(true);
    expect(await orderState(order.id)).toMatchObject({
      status: "received",
      payment_method: "cod",
      payment_status: "pending",
    });
  });

  it("refuses once PayHere has the payment in hand or pending", async () => {
    const paid = await placeOrder();
    await notify((await startPayment(paid.token)).reference, 2);
    expect(await switchToCash(paid.token)).toBe(false);

    const pending = await placeOrder();
    await notify((await startPayment(pending.token)).reference, 0);
    expect(await switchToCash(pending.token)).toBe(false);
  });

  it("is overtaken by a payment that completes afterwards", async () => {
    const order = await placeOrder();
    const { reference } = await startPayment(order.token);
    await switchToCash(order.token);
    await notify(reference, 2);
    expect(await orderState(order.id)).toMatchObject({
      status: "received",
      payment_method: "payhere",
      payment_status: "paid",
    });
  });
});

describe("expire_unpaid_orders()", () => {
  const backdate = (id: string) =>
    db.query("update public.orders set created_at = now() - interval '1 hour' where id = $1", [id]);

  it("cancels old unpaid orders and gives their promo code back", async () => {
    const order = await placeOrder({
      promo_code_id: kottu200,
      discount_cents: 200_00,
      total_cents: TOTAL - 200_00,
    });
    const recent = await placeOrder();
    const cash = await placeOrder({ payment_method: "cod" });
    await Promise.all([backdate(order.id), backdate(cash.id)]);

    await asService("select public.expire_unpaid_orders()");
    expect((await orderState(order.id)).status).toBe("cancelled");
    expect((await orderState(recent.id)).status).toBe("awaiting_payment");
    expect((await orderState(cash.id)).status).toBe("received");
    const { rows } = await db.query("select 1 from public.promo_redemptions where order_id = $1", [
      order.id,
    ]);
    expect(rows).toEqual([]);
  });

  it("leaves orders with a payment in progress", async () => {
    const order = await placeOrder();
    await startPayment(order.token);
    await backdate(order.id);
    await asService("select public.expire_unpaid_orders()");
    expect((await orderState(order.id)).status).toBe("awaiting_payment");
  });
});

describe("payment access", () => {
  it("keeps payment functions away from the public and signed-in API roles", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      for (const sql of [
        "select * from public.start_payment('x')",
        "select * from public.apply_payhere_notification('{}')",
        "select public.pay_on_delivery_instead('x')",
        "select public.expire_unpaid_orders()",
      ]) {
        await asRole(db, role, role === "authenticated" ? CUSTOMER : null, async (tx) => {
          await expect(tx.query(sql)).rejects.toThrow(/permission denied/);
        });
      }
    }
  });

  it("shows payments to admins only", async () => {
    const order = await placeOrder({ user_id: CUSTOMER });
    await startPayment(order.token);
    const count = (role: "authenticated", user: string) =>
      asRole(db, role, user, async (tx) => {
        const { rows } = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.payments",
        );
        return rows[0]!.n;
      });
    expect(await count("authenticated", CUSTOMER)).toBe(0);
    expect(await count("authenticated", ADMIN)).toBeGreaterThan(0);
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("select * from public.payments")).rejects.toThrow(/permission denied/);
    });
  });
});
