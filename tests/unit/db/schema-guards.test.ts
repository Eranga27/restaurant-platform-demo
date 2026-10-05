import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase } from "./harness";

/**
 * Schema-wide rules (docs/SECURITY.md). They fail when a migration adds a
 * table without RLS, opens a table or function to the API roles, or adds a
 * privileged function without a fixed search_path. When a change here is
 * intended, update the expected list in the same pull request.
 */

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase({ seed: false });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const column = async (sql: string) =>
  (await db.query<{ v: string }>(sql)).rows.map((r) => r.v).sort();

const grants = async (role: "anon" | "authenticated") => {
  const { rows } = await db.query<{ t: string; p: string }>(
    `select table_name as t, string_agg(privilege_type, ',' order by privilege_type) as p
     from information_schema.role_table_grants
     where grantee = $1 and table_schema = 'public'
     group by table_name`,
    [role],
  );
  return Object.fromEntries(rows.map((r) => [r.t, r.p]));
};

const callable = (role: "anon" | "authenticated") =>
  column(`select p.proname as v from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.prorettype <> 'trigger'::regtype
            and has_function_privilege('${role}', p.oid, 'execute')`);

describe("every table", () => {
  it("has Row Level Security on", async () => {
    expect(
      await column(
        "select tablename as v from pg_tables where schemaname = 'public' and not rowsecurity",
      ),
    ).toEqual([]);
  });

  it("has policies, unless only the server may touch it", async () => {
    const withoutPolicies = await column(
      `select c.relname as v from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'
         and not exists (select 1 from pg_policy p where p.polrelid = c.oid)`,
    );
    expect(withoutPolicies).toEqual(["branch_secrets"]);
    const [anon, authenticated] = await Promise.all([grants("anon"), grants("authenticated")]);
    for (const table of withoutPolicies) {
      expect(anon[table]).toBeUndefined();
      expect(authenticated[table]).toBeUndefined();
    }
  });
});

describe("the public API (anon)", () => {
  it("can only read the catalogue", async () => {
    const catalogue = "SELECT";
    expect(await grants("anon")).toEqual({
      branch_menu_overrides: catalogue,
      branches: catalogue,
      categories: catalogue,
      cities: catalogue,
      districts: catalogue,
      holidays: catalogue,
      item_option_values: catalogue,
      item_options: catalogue,
      menu_items: catalogue,
      promotions: catalogue,
      settings: catalogue,
    });
  });

  it("reads reviews only through the columns the site shows", async () => {
    expect(
      await column(
        `select column_name as v from information_schema.role_column_grants
         where grantee = 'anon' and table_schema = 'public' and table_name = 'reviews'`,
      ),
    ).toEqual(["author_name", "body", "branch_id", "created_at", "id", "rating", "status"]);
  });

  it("can only call the helpers that RLS policies and checks use", async () => {
    expect(await callable("anon")).toEqual(["is_admin", "is_branch_staff", "is_i18n_text"]);
  });
});

describe("signed-in users (authenticated)", () => {
  it("have only these table privileges; RLS decides the rows", async () => {
    const all = "DELETE,INSERT,SELECT,UPDATE";
    expect(await grants("authenticated")).toEqual({
      addresses: all,
      audit_logs: "SELECT",
      branch_menu_overrides: all,
      branches: all,
      categories: all,
      cities: "SELECT",
      districts: "SELECT",
      event_inquiries: "SELECT",
      holidays: all,
      item_option_values: all,
      item_options: all,
      loyalty_ledger: "SELECT",
      menu_items: all,
      order_items: "SELECT",
      order_status_events: "SELECT",
      orders: "SELECT",
      payment_notifications: "SELECT",
      payments: "SELECT",
      profiles: "SELECT",
      promo_codes: all,
      promo_redemptions: "SELECT",
      promotions: all,
      push_subscriptions: "DELETE,INSERT,SELECT",
      reservations: "SELECT",
      reviews: "DELETE,INSERT,UPDATE",
      settings: "SELECT,UPDATE",
    });
  });

  it("can call only these functions, each of which checks the caller's role", async () => {
    expect(await callable("authenticated")).toEqual([
      "admin_find_user",
      "admin_sales_report",
      "admin_staff_list",
      "has_mfa",
      "is_admin",
      "is_branch_manager",
      "is_branch_staff",
      "is_i18n_text",
      "mark_payment_refunded",
      "moderate_review",
      "quote_event_inquiry",
      "set_branch_accepting_orders",
      "set_event_status",
      "set_item_availability",
      "set_staff_role",
      "update_order_status",
      "update_reservation_status",
    ]);
  });
});

describe("privileged functions", () => {
  it("all fix their search_path", async () => {
    expect(
      await column(
        `select p.proname as v from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prosecdef
           and not exists (
             select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
           )`,
      ),
    ).toEqual([]);
  });
});
