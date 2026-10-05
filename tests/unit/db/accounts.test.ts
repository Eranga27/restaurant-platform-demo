import { randomBytes, randomUUID } from "node:crypto";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const CUSTOMER = "00000000-0000-4000-8000-0000000007c1";
const OTHER_CUSTOMER = "00000000-0000-4000-8000-0000000007c2";
const ADMIN = "00000000-0000-4000-8000-0000000007a1";

const kottu = seed.stableId("menu-item", "chicken-kottu");

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, CUSTOMER);
  await createUser(db, OTHER_CUSTOMER);
  await createUser(db, ADMIN, { role: "admin" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

/**
 * A pickup order for two kottu (Rs 3,300 of food), as src/lib/orders/service.ts
 * builds it, optionally paying for some of it with loyalty points (Rs 1 each).
 */
function payload({ userId = CUSTOMER as string | null, points = 0 } = {}) {
  const subtotal = 3300_00;
  const loyalty = points * 1_00;
  const service = 330_00;
  const vat = 653_40;
  return {
    public_token: randomBytes(24).toString("base64url"),
    order_number: randomBytes(3).toString("hex").toUpperCase(),
    branch_id: seed.stableId("branch", "nugegoda"),
    user_id: userId,
    customer_name: "Nimal Perera",
    customer_phone: "+94770000123",
    customer_email: "nimal@example.com",
    type: "pickup",
    scheduled_for: null,
    notes: null,
    subtotal_cents: subtotal,
    discount_cents: 0,
    loyalty_points_used: points,
    loyalty_discount_cents: loyalty,
    service_charge_cents: service,
    vat_cents: vat,
    delivery_fee_cents: 0,
    total_cents: subtotal - loyalty + service + vat,
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
  };
}

type Placed = { order_id: string; public_token: string };

async function place(p: ReturnType<typeof payload>): Promise<Placed> {
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

const setStatus = (orderId: string, status: string) =>
  db.query("update public.orders set status = $2 where id = $1", [orderId, status]);

async function balance(userId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>("select public.loyalty_balance($1) as n", [
    userId,
  ]);
  return rows[0]!.n;
}

/** Starts a customer with a known balance, whatever earlier tests left. */
async function resetPoints(userId: string, points: number) {
  await db.query("delete from public.loyalty_ledger where user_id = $1", [userId]);
  if (points > 0) {
    await db.query(
      "insert into public.loyalty_ledger (user_id, points, reason) values ($1, $2, 'adjusted')",
      [userId, points],
    );
  }
}

function address(overrides: Record<string, unknown> = {}) {
  return {
    user_id: CUSTOMER,
    label: "Home",
    district: "Colombo",
    city: "Nugegoda",
    line: "12 Station Road",
    lat: 6.87,
    lng: 79.89,
    ...overrides,
  };
}

const insertAddress = (tx: { query: PGlite["query"] }, a: ReturnType<typeof address>) =>
  tx.query(
    `insert into public.addresses (user_id, label, district, city, line, lat, lng)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [a.user_id, a.label, a.district, a.city, a.line, a.lat, a.lng],
  );

describe("saved addresses", () => {
  it("customers add, read and delete their own", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      const { rows } = await insertAddress(tx, address());
      const id = (rows[0] as { id: string }).id;
      const mine = await tx.query("select id from public.addresses");
      expect(mine.rows).toEqual([{ id }]);
      await tx.query("delete from public.addresses where id = $1", [id]);
      expect((await tx.query("select id from public.addresses")).rows).toEqual([]);
    });
  });

  it("are private to their owner", async () => {
    await insertAddress(db, address());
    try {
      await asRole(db, "authenticated", OTHER_CUSTOMER, async (tx) => {
        expect((await tx.query("select id from public.addresses")).rows).toEqual([]);
        const update = await tx.query("update public.addresses set label = 'Mine' returning id");
        expect(update.rows).toEqual([]);
      });
      await asRole(db, "anon", null, async (tx) => {
        await expect(tx.query("select id from public.addresses")).rejects.toThrow(
          /permission denied/,
        );
      });
    } finally {
      await db.query("delete from public.addresses where user_id = $1", [CUSTOMER]);
    }
  });

  it("can't be saved to someone else's account", async () => {
    await asRole(db, "authenticated", OTHER_CUSTOMER, async (tx) => {
      await expect(insertAddress(tx, address())).rejects.toThrow(/row-level security/);
    });
  });

  it("are limited to ten per account", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      for (let i = 0; i < 10; i++) await insertAddress(tx, address({ label: `Place ${i}` }));
      await expect(insertAddress(tx, address({ label: "One more" }))).rejects.toThrow(
        /too_many_addresses/,
      );
    });
  });

  it("must be in Sri Lanka", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      await expect(insertAddress(tx, address({ lat: 51.5, lng: -0.12 }))).rejects.toThrow(
        /check constraint/,
      );
    });
  });
});

describe("loyalty points", () => {
  it("are earned once when an order is completed: a point per Rs 100 of food", async () => {
    await resetPoints(CUSTOMER, 0);
    const order = await place(payload());
    await setStatus(order.order_id, "accepted");
    expect(await balance(CUSTOMER)).toBe(0);
    await setStatus(order.order_id, "completed");
    expect(await balance(CUSTOMER)).toBe(33);
    // A repeated update (a retry, or staff correcting a status) doesn't earn twice.
    await setStatus(order.order_id, "ready");
    await setStatus(order.order_id, "completed");
    expect(await balance(CUSTOMER)).toBe(33);
  });

  it("aren't earned on the part of an order paid with points", async () => {
    await resetPoints(CUSTOMER, 300);
    const order = await place(payload({ points: 300 }));
    expect(await balance(CUSTOMER)).toBe(0);
    await setStatus(order.order_id, "completed");
    expect(await balance(CUSTOMER)).toBe(30); // (Rs 3,300 − Rs 300) / Rs 100
  });

  it("aren't earned by guests", async () => {
    const order = await place(payload({ userId: null }));
    await setStatus(order.order_id, "completed");
    const { rows } = await db.query("select 1 from public.loyalty_ledger where order_id = $1", [
      order.order_id,
    ]);
    expect(rows).toHaveLength(0);
  });

  it("aren't earned while the loyalty programme is switched off", async () => {
    await resetPoints(CUSTOMER, 0);
    await db.query(
      `update public.settings set brand = jsonb_set(coalesce(brand, '{}'), '{features}',
         coalesce(brand -> 'features', '{}') || '{"loyalty": false}') where id = 1`,
    );
    try {
      const order = await place(payload());
      await setStatus(order.order_id, "completed");
      expect(await balance(CUSTOMER)).toBe(0);
    } finally {
      await db.query(
        "update public.settings set brand = brand #- '{features,loyalty}' where id = 1",
      );
    }
  });

  it("are spent when the order is placed, and come back once if it's rejected", async () => {
    await resetPoints(CUSTOMER, 500);
    const order = await place(payload({ points: 200 }));
    expect(await balance(CUSTOMER)).toBe(300);
    await setStatus(order.order_id, "rejected");
    expect(await balance(CUSTOMER)).toBe(500);
    await setStatus(order.order_id, "cancelled");
    expect(await balance(CUSTOMER)).toBe(500);
  });

  it("can't be spent twice", async () => {
    await resetPoints(CUSTOMER, 250);
    await place(payload({ points: 200 }));
    await expect(place(payload({ points: 200 }))).rejects.toThrow(/loyalty_insufficient/);
    expect(await balance(CUSTOMER)).toBe(50);
  });

  it("need an account", async () => {
    await expect(place(payload({ userId: null, points: 100 }))).rejects.toThrow(
      /loyalty_needs_an_account/,
    );
  });

  it("don't stop an account being deleted: its orders stay, without the account", async () => {
    const leaving = "00000000-0000-4000-8000-0000000007c9";
    await createUser(db, leaving);
    await resetPoints(leaving, 100);
    const order = await place(payload({ userId: leaving, points: 100 }));
    await db.query("delete from auth.users where id = $1", [leaving]);
    const { rows } = await db.query(
      "select user_id, loyalty_points_used from public.orders where id = $1",
      [order.order_id],
    );
    expect(rows).toEqual([{ user_id: null, loyalty_points_used: 100 }]);
    expect(await balance(leaving)).toBe(0);
  });

  it("count towards the order's totals", async () => {
    await resetPoints(CUSTOMER, 100);
    const p = payload({ points: 100 });
    await expect(place({ ...p, total_cents: p.total_cents + 100_00 })).rejects.toThrow(
      /totals_add_up/,
    );
  });

  it("are visible only to their owner, who can't change them", async () => {
    await resetPoints(CUSTOMER, 40);
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      const { rows } = await tx.query<{ points: number }>(
        "select points from public.loyalty_ledger",
      );
      expect(rows).toEqual([{ points: 40 }]);
    });
    // One refused statement per transaction: the first aborts it.
    for (const sql of [
      "insert into public.loyalty_ledger (user_id, points, reason) values ($1, 1000, 'adjusted')",
      "select public.loyalty_balance($1)",
    ]) {
      await asRole(db, "authenticated", CUSTOMER, async (tx) => {
        await expect(tx.query(sql, [CUSTOMER])).rejects.toThrow(/permission denied/);
      });
    }
    await asRole(db, "authenticated", OTHER_CUSTOMER, async (tx) => {
      expect((await tx.query("select 1 from public.loyalty_ledger")).rows).toHaveLength(0);
    });
  });
});

describe("reviews", () => {
  const submit = async (token: string, author = "Nimal") => {
    await db.exec("set role service_role");
    try {
      const { rows } = await db.query<{ id: string }>(
        "select public.submit_review($1, 5::smallint, 'Lovely kottu, still hot.', $2) as id",
        [token, author],
      );
      return rows[0]!.id;
    } finally {
      await db.exec("reset role");
    }
  };

  it("can be left once an order is completed, and wait for approval", async () => {
    const order = await place(payload());
    await expect(submit(order.public_token)).rejects.toThrow(/not_reviewable/);
    await setStatus(order.order_id, "completed");
    const id = await submit(order.public_token);
    const { rows } = await db.query(
      "select status, order_id, user_id from public.reviews where id = $1",
      [id],
    );
    expect(rows).toEqual([{ status: "pending", order_id: order.order_id, user_id: CUSTOMER }]);
    await expect(submit(order.public_token)).rejects.toThrow(/already_reviewed/);
  });

  it("close 60 days after the order", async () => {
    const order = await place(payload());
    await setStatus(order.order_id, "completed");
    // Skip the updated_at trigger to backdate the order.
    await db.exec("set session_replication_role = replica");
    await db.query(
      "update public.orders set updated_at = now() - interval '61 days' where id = $1",
      [order.order_id],
    );
    await db.exec("set session_replication_role = origin");
    await expect(submit(order.public_token)).rejects.toThrow(/too_late/);
  });

  it("can't be submitted with the public or signed-in API roles", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await asRole(db, role, role === "authenticated" ? CUSTOMER : null, async (tx) => {
        await expect(
          tx.query("select public.submit_review('x', 5::smallint, 'Great food here', 'Me')"),
        ).rejects.toThrow(/permission denied/);
      });
    }
  });

  it("are shown publicly only once approved, without the author's account", async () => {
    const order = await place(payload());
    await setStatus(order.order_id, "completed");
    const id = await submit(order.public_token);
    const visible = (role: "anon" | "authenticated", user: string | null) =>
      asRole(db, role, user, async (tx) => {
        const { rows } = await tx.query("select id from public.reviews where id = $1", [id]);
        return rows.length > 0;
      });

    expect(await visible("anon", null)).toBe(false);
    expect(await visible("authenticated", OTHER_CUSTOMER)).toBe(false);
    expect(await visible("authenticated", CUSTOMER)).toBe(true);

    await db.query("update public.reviews set status = 'approved' where id = $1", [id]);
    expect(await visible("anon", null)).toBe(true);
    for (const role of ["anon", "authenticated"] as const) {
      await asRole(db, role, role === "authenticated" ? OTHER_CUSTOMER : null, async (tx) => {
        await expect(tx.query("select user_id from public.reviews")).rejects.toThrow(
          /permission denied/,
        );
      });
    }
  });

  it("are approved or rejected only by an admin with two-step sign-in, and audited", async () => {
    const order = await place(payload());
    await setStatus(order.order_id, "completed");
    const id = await submit(order.public_token);
    const moderate = (user: string, aal: "aal1" | "aal2" = "aal2") =>
      asRole(
        db,
        "authenticated",
        user,
        async (tx) => {
          await tx.query("select public.moderate_review($1, 'approved')", [id]);
          const review = await tx.query<{ status: string; moderated: boolean }>(
            "select status, moderated_at is not null as moderated from public.reviews where id = $1",
            [id],
          );
          const audit = await tx.query(
            "select 1 from public.audit_logs where entity = 'reviews' and entity_id = $1",
            [id],
          );
          return { review: review.rows[0], audited: audit.rows.length > 0 };
        },
        { aal },
      );

    await expect(moderate(CUSTOMER)).rejects.toThrow(/not_allowed/);
    await expect(moderate(ADMIN, "aal1")).rejects.toThrow(/not_allowed/);
    expect(await moderate(ADMIN)).toEqual({
      review: { status: "approved", moderated: true },
      audited: true,
    });
  });
});
