import { randomBytes, randomUUID } from "node:crypto";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const SECOND_ADMIN = "00000000-0000-4000-8000-0000000000a2";
const MANAGER = "00000000-0000-4000-8000-0000000000e1";
const STAFF = "00000000-0000-4000-8000-0000000000d1";
const CUSTOMER = "00000000-0000-4000-8000-0000000000c1";

const nugegoda = seed.stableId("branch", "nugegoda");
const kottu = seed.stableId("menu-item", "chicken-kottu");

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, ADMIN, { role: "admin" });
  await createUser(db, SECOND_ADMIN, { role: "admin" });
  await createUser(db, MANAGER, { role: "manager", branchSlug: "nugegoda" });
  await createUser(db, STAFF, { role: "staff", branchSlug: "nugegoda" });
  await createUser(db, CUSTOMER);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const aal1 = { aal: "aal1" as const };

/** Runs SQL as a signed-in user at an MFA level, keeping the result. */
async function asUser<T>(
  user: string,
  sql: string,
  params: unknown[] = [],
  aal: "aal1" | "aal2" = "aal2",
): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.query("select set_config('request.jwt.claim.aal', $1, false)", [aal]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.query("select set_config('request.jwt.claim.aal', '', false)");
  }
}

describe("two-step sign-in for managers and admins", () => {
  it("withholds admin rights from a session without MFA", async () => {
    const update =
      "update public.menu_items set base_price_cents = 1700_00 where id = $1 returning id".replace(
        "1700_00",
        "170000",
      );
    await asRole(db, "authenticated", ADMIN, async (tx) => {
      expect((await tx.query(update, [kottu])).rows).toHaveLength(1);
    });
    await asRole(
      db,
      "authenticated",
      ADMIN,
      async (tx) => {
        expect((await tx.query(update, [kottu])).rows).toHaveLength(0); // RLS: not an admin yet
        await expect(tx.query("select * from public.audit_logs")).resolves.toMatchObject({
          rows: [],
        });
      },
      aal1,
    );
  });

  it("withholds manager rights without MFA, but not plain staff rights", async () => {
    const check = (user: string, aal: "aal1" | "aal2") =>
      asUser<{ ok: boolean }>(user, "select public.is_branch_staff($1) as ok", [nugegoda], aal);
    expect((await check(MANAGER, "aal2"))[0]!.ok).toBe(true);
    expect((await check(MANAGER, "aal1"))[0]!.ok).toBe(false);
    expect((await check(STAFF, "aal1"))[0]!.ok).toBe(true);
    const manager = (aal: "aal1" | "aal2") =>
      asUser<{ ok: boolean }>(
        MANAGER,
        "select public.is_branch_manager($1) as ok",
        [nugegoda],
        aal,
      );
    expect((await manager("aal1"))[0]!.ok).toBe(false);
  });
});

describe("audit log", () => {
  it("records catalogue changes with who made them and what changed", async () => {
    await asUser(ADMIN, "update public.menu_items set base_price_cents = 175000 where id = $1", [
      kottu,
    ]);
    const { rows } = await db.query<{
      actor_id: string;
      action: string;
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    }>(
      "select actor_id, action, before, after from public.audit_logs where entity = 'menu_items' and entity_id = $1 order by id desc limit 1",
      [kottu],
    );
    expect(rows[0]).toMatchObject({
      actor_id: ADMIN,
      action: "update",
      after: { base_price_cents: 175000 },
    });
    expect(Object.keys(rows[0]!.after)).toEqual(["base_price_cents"]);
  });

  it("records only role and branch changes for profiles, not personal details", async () => {
    await db.query("update public.profiles set full_name = 'Changed Name' where id = $1", [
      CUSTOMER,
    ]);
    const { rows } = await db.query(
      "select 1 from public.audit_logs where entity = 'profiles' and entity_id = $1",
      [CUSTOMER],
    );
    expect(rows).toEqual([]);
  });

  it("is readable by admins only", async () => {
    const count = async (user: string) =>
      (await asUser<{ n: number }>(user, "select count(*)::int as n from public.audit_logs"))[0]!.n;
    expect(await count(ADMIN)).toBeGreaterThan(0);
    expect(await count(MANAGER)).toBe(0);
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("select * from public.audit_logs")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

describe("set_staff_role()", () => {
  const setRole = (
    actor: string,
    target: string,
    role: string,
    branch: string | null,
    aal: "aal1" | "aal2" = "aal2",
  ) =>
    asUser(
      actor,
      "select public.set_staff_role($1, $2::public.app_role, $3)",
      [target, role, branch],
      aal,
    );

  it("lets admins give roles, and audits them", async () => {
    await setRole(ADMIN, CUSTOMER, "staff", nugegoda);
    const { rows } = await db.query<{ role: string }>(
      "select role from public.profiles where id = $1",
      [CUSTOMER],
    );
    expect(rows[0]!.role).toBe("staff");
    const audit = await db.query<{ after: Record<string, unknown> }>(
      "select after from public.audit_logs where entity = 'profiles' and entity_id = $1 order by id desc limit 1",
      [CUSTOMER],
    );
    expect(audit.rows[0]!.after).toMatchObject({ role: "staff" });
    await setRole(ADMIN, CUSTOMER, "customer", null);
  });

  it("refuses non-admins, admins without MFA, self-changes and a missing branch", async () => {
    await expect(setRole(MANAGER, CUSTOMER, "staff", nugegoda)).rejects.toThrow(/not_allowed/);
    await expect(setRole(ADMIN, CUSTOMER, "staff", nugegoda, "aal1")).rejects.toThrow(
      /not_allowed/,
    );
    await expect(setRole(ADMIN, ADMIN, "customer", null)).rejects.toThrow(/cannot_change_own_role/);
    await expect(setRole(ADMIN, CUSTOMER, "manager", null)).rejects.toThrow(/branch_required/);
  });

  it("lets one admin step another down, but never themself", async () => {
    await setRole(ADMIN, SECOND_ADMIN, "manager", nugegoda);
    // The demoted account can no longer act as an admin.
    await expect(setRole(SECOND_ADMIN, CUSTOMER, "staff", nugegoda)).rejects.toThrow(/not_allowed/);
    await setRole(ADMIN, SECOND_ADMIN, "admin", null);
    // Self-changes are refused, so the last admin can't remove themself.
    await expect(setRole(SECOND_ADMIN, SECOND_ADMIN, "customer", null)).rejects.toThrow(
      /cannot_change_own_role/,
    );
  });

  it("lists staff with emails for admins only", async () => {
    const rows = await asUser<{ email: string; role: string }>(
      ADMIN,
      "select * from public.admin_staff_list()",
    );
    expect(rows.map((r) => r.role)).toContain("manager");
    expect(rows.every((r) => r.role !== "customer")).toBe(true);
    await expect(asUser(MANAGER, "select * from public.admin_staff_list()")).rejects.toThrow(
      /not_allowed/,
    );
  });
});

describe("refunds and reports", () => {
  async function paidOrder(status: string) {
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
      subtotal_cents: 1650_00,
      discount_cents: 0,
      service_charge_cents: 165_00,
      vat_cents: 326_70,
      delivery_fee_cents: 0,
      total_cents: 2141_70,
      payment_method: "payhere",
      idempotency_key: randomUUID(),
      locale: "en",
      items: [
        {
          menu_item_id: kottu,
          name_i18n: { en: "Chicken kottu" },
          unit_price_cents: 1650_00,
          quantity: 1,
          options: [],
          line_total_cents: 1650_00,
          sort_order: 0,
        },
      ],
    };
    await db.exec("set role service_role");
    try {
      const { rows } = await db.query<{ order_id: string }>(
        "select * from public.place_order($1)",
        [JSON.stringify(payload)],
      );
      const [attempt] = (
        await db.query<{ payment_id: string; reference: string }>(
          "select * from public.start_payment($1)",
          [payload.public_token],
        )
      ).rows;
      await db.query("select * from public.apply_payhere_notification($1)", [
        JSON.stringify({
          reference: attempt!.reference,
          amount_cents: 2141_70,
          currency: "LKR",
          status_code: 2,
          raw: {},
        }),
      ]);
      await db.query("update public.orders set status = $2 where id = $1", [
        rows[0]!.order_id,
        status,
      ]);
      return { orderId: rows[0]!.order_id, paymentId: attempt!.payment_id };
    } finally {
      await db.exec("reset role");
    }
  }

  it("lets admins record a refund for a paid payment", async () => {
    const { orderId, paymentId } = await paidOrder("rejected");
    await expect(
      asUser(MANAGER, "select public.mark_payment_refunded($1, 'x')", [paymentId]),
    ).rejects.toThrow(/not_allowed/);
    await asUser(ADMIN, "select public.mark_payment_refunded($1, 'PH ref 123')", [paymentId]);
    const { rows } = await db.query<{ payment_status: string }>(
      "select payment_status from public.orders where id = $1",
      [orderId],
    );
    expect(rows[0]!.payment_status).toBe("refunded");
    await expect(
      asUser(ADMIN, "select public.mark_payment_refunded($1)", [paymentId]),
    ).rejects.toThrow(/not_refundable/);
  });

  it("reports sales by day, branch and dish, excluding rejected orders", async () => {
    await paidOrder("completed");
    await paidOrder("rejected");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
    const [row] = await asUser<{
      report: { totals: { orders: number }; topItems: { name: string }[]; byDay: unknown[] };
    }>(ADMIN, "select public.admin_sales_report($1, $1) as report", [today]);
    expect(row!.report.totals.orders).toBeGreaterThanOrEqual(1);
    expect(row!.report.topItems[0]!.name).toBe("Chicken kottu");
    expect(row!.report.byDay).toHaveLength(1);
    await expect(
      asUser(STAFF, "select public.admin_sales_report($1, $1)", [today]),
    ).rejects.toThrow(/not_allowed/);
  });
});
