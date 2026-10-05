import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * An in-memory Postgres (PGlite) with the bits of Supabase our migrations rely
 * on: the `auth` schema, `auth.uid()` and the API roles. Lets RLS and
 * constraints be tested without Docker. CI also runs the real Supabase stack.
 */

const SUPABASE_STUB = `
  create schema if not exists auth;
  create schema if not exists extensions;

  create table auth.users (
    id uuid primary key,
    email text,
    phone text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  -- The session's claims. "aal" is the MFA level: aal2 once a TOTP code was
  -- verified. Tests get aal2 unless they set request.jwt.claim.aal to aal1.
  create or replace function auth.jwt() returns jsonb
  language sql stable as $$
    select jsonb_build_object(
      'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
      'aal', coalesce(nullif(current_setting('request.jwt.claim.aal', true), ''), 'aal2')
    )
  $$;

  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;

  -- Supabase gives service_role (the secret key) full access to new tables.
  alter default privileges in schema public grant all on tables to service_role;
  alter default privileges in schema public grant all on sequences to service_role;

  -- Realtime broadcast from the database. The stub records each message so
  -- tests can assert on it.
  create schema if not exists realtime;
  create table realtime.sent (
    id bigserial primary key,
    topic text not null,
    event text not null,
    payload jsonb not null,
    private boolean not null
  );
  create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
  returns void language sql as $$
    insert into realtime.sent (topic, event, payload, private) values (topic, event, payload, private)
  $$;
`;

const root = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));

export async function createTestDatabase({ seed = true } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);

  const migrationsDir = root("supabase/migrations");
  for (const file of readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(`${migrationsDir}/${file}`, "utf8"));
  }
  if (seed) await db.exec(readFileSync(root("supabase/seed.sql"), "utf8"));
  return db;
}

export type Role = "anon" | "authenticated" | "service_role";

/**
 * Runs `fn` as an API role (optionally as a signed-in user), inside a
 * transaction that is always rolled back.
 */
export async function asRole<T>(
  db: PGlite,
  role: Role,
  userId: string | null,
  fn: (tx: Transaction) => Promise<T>,
  { aal = "aal2" }: { aal?: "aal1" | "aal2" } = {},
): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  await db
    .transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      await tx.query("select set_config('request.jwt.claim.aal', $1, true)", [aal]);
      await tx.exec(`set local role ${role}`);
      try {
        result = await fn(tx);
      } catch (error) {
        failure = error;
      }
      await tx.rollback();
    })
    .catch(() => {
      // rollback() rejects the transaction promise by design
    });
  if (failure) throw failure;
  return result as T;
}

/** Creates an auth user (the profile trigger runs) and optionally sets its role. */
export async function createUser(
  db: PGlite,
  id: string,
  options: { role?: "customer" | "staff" | "manager" | "admin"; branchSlug?: string } = {},
): Promise<void> {
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    `${id.slice(0, 8)}@test.example`,
    JSON.stringify({ full_name: "Test User" }),
  ]);
  if (options.role && options.role !== "customer") {
    await db.query(
      `update public.profiles
       set role = $2, branch_id = (select id from public.branches where slug = $3)
       where id = $1`,
      [id, options.role, options.branchSlug ?? null],
    );
  }
}
