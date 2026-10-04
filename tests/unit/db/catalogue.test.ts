import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as seed from "@/data/seed";

import { asRole, createTestDatabase, createUser } from "./harness";

const ADMIN = "00000000-0000-4000-8000-00000000000a";
const CUSTOMER = "00000000-0000-4000-8000-00000000000c";
const NUGEGODA_STAFF = "00000000-0000-4000-8000-00000000000d";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, ADMIN, { role: "admin" });
  await createUser(db, CUSTOMER);
  await createUser(db, NUGEGODA_STAFF, { role: "staff", branchSlug: "nugegoda" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const count = async (tx: { query: PGlite["query"] }, table: string) =>
  Number(
    (await tx.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0]?.n,
  );

describe("migrations and seed", () => {
  it("load the full demo catalogue", async () => {
    expect(await count(db, "branches")).toBe(seed.branches.length);
    expect(await count(db, "categories")).toBe(seed.categories.length);
    expect(await count(db, "menu_items")).toBe(seed.menuItems.length);
    expect(await count(db, "item_options")).toBe(seed.itemOptions.length);
    expect(await count(db, "item_option_values")).toBe(seed.itemOptionValues.length);
    expect(await count(db, "holidays")).toBe(seed.holidays.length);
    expect(await count(db, "districts")).toBe(25);
    expect(seed.menuItems.length).toBeGreaterThanOrEqual(40);
  });

  it("gives every new user a customer profile", async () => {
    const { rows } = await db.query<{ role: string; full_name: string }>(
      "select role, full_name from public.profiles where id = $1",
      [CUSTOMER],
    );
    expect(rows[0]).toEqual({ role: "customer", full_name: "Test User" });
  });

  it("rejects translatable text without English", async () => {
    await expect(
      db.query(
        "insert into public.categories (slug, name_i18n) values ('x', '{\"si\": \"x\"}'::jsonb)",
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("public visitors (anon)", () => {
  it("can read the menu, branches, approved reviews and settings", async () => {
    await asRole(db, "anon", null, async (tx) => {
      expect(await count(tx, "menu_items")).toBe(seed.menuItems.length);
      expect(await count(tx, "branches")).toBe(seed.branches.length);
      expect(await count(tx, "item_option_values")).toBe(seed.itemOptionValues.length);
      expect(await count(tx, "reviews")).toBe(seed.reviews.length);
      expect(await count(tx, "settings")).toBe(1);
    });
  });

  it("cannot see inactive items, or the options of inactive items", async () => {
    await db.query("update public.menu_items set is_active = false where slug = 'chicken-kottu'");
    try {
      await asRole(db, "anon", null, async (tx) => {
        const items = await tx.query(
          "select 1 from public.menu_items where slug = 'chicken-kottu'",
        );
        expect(items.rows).toHaveLength(0);
        const options = await tx.query(
          `select 1 from public.item_options o
           join public.menu_items m on m.id = o.menu_item_id
           where m.slug = 'chicken-kottu'`,
        );
        expect(options.rows).toHaveLength(0);
      });
    } finally {
      await db.query("update public.menu_items set is_active = true where slug = 'chicken-kottu'");
    }
  });

  it("cannot see promotions that have ended or pending reviews", async () => {
    await db.query(
      `insert into public.promotions (slug, title_i18n, starts_on, ends_on)
       values ('expired', '{"en": "Old"}', '2020-01-01', '2020-01-31')`,
    );
    await db.query(
      `insert into public.reviews (author_name, rating, body, status)
       values ('Spam', 1, 'Buy followers', 'pending')`,
    );
    await asRole(db, "anon", null, async (tx) => {
      expect(
        (await tx.query("select 1 from public.promotions where slug = 'expired'")).rows,
      ).toHaveLength(0);
      expect(
        (await tx.query("select 1 from public.reviews where status <> 'approved'")).rows,
      ).toHaveLength(0);
    });
  });

  it("cannot read profiles or write to the catalogue", async () => {
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("select * from public.profiles")).rejects.toThrow(/permission denied/);
    });
    await asRole(db, "anon", null, async (tx) => {
      await expect(tx.query("update public.menu_items set base_price_cents = 1")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

describe("signed-in customers", () => {
  it("can change their own name but not their role or branch", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      const updated = await tx.query(
        "update public.profiles set full_name = 'Nimal' where id = $1 returning full_name",
        [CUSTOMER],
      );
      expect(updated.rows).toEqual([{ full_name: "Nimal" }]);
    });
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      await expect(
        tx.query("update public.profiles set role = 'admin' where id = $1", [CUSTOMER]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("only see their own profile", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      const { rows } = await tx.query<{ id: string }>("select id from public.profiles");
      expect(rows.map((r) => r.id)).toEqual([CUSTOMER]);
    });
  });

  it("cannot change prices", async () => {
    await asRole(db, "authenticated", CUSTOMER, async (tx) => {
      const result = await tx.query(
        "update public.menu_items set base_price_cents = 1 where slug = 'chicken-kottu' returning id",
      );
      // RLS hides the row from the update rather than raising.
      expect(result.rows).toHaveLength(0);
    });
  });
});

describe("branch staff and admins", () => {
  const overrideFor = (branchSlug: string) => `
    insert into public.branch_menu_overrides (branch_id, menu_item_id, is_available)
    select b.id, m.id, false from public.branches b, public.menu_items m
    where b.slug = '${branchSlug}' and m.slug = 'egg-hoppers'
    on conflict (branch_id, menu_item_id) do update set is_available = excluded.is_available
    returning branch_id`;

  it("staff can mark items sold out at their own branch only", async () => {
    await asRole(db, "authenticated", NUGEGODA_STAFF, async (tx) => {
      expect((await tx.query(overrideFor("nugegoda"))).rows).toHaveLength(1);
    });
    await asRole(db, "authenticated", NUGEGODA_STAFF, async (tx) => {
      await expect(tx.query(overrideFor("kandy"))).rejects.toThrow(/row-level security/);
    });
  });

  it("admins can manage the catalogue", async () => {
    await asRole(db, "authenticated", ADMIN, async (tx) => {
      const { rows } = await tx.query(
        "update public.menu_items set base_price_cents = 170000 where slug = 'chicken-kottu' returning id",
      );
      expect(rows).toHaveLength(1);
      await tx.query(
        "insert into public.categories (slug, name_i18n) values ('specials', '{\"en\": \"Specials\"}')",
      );
    });
  });
});
