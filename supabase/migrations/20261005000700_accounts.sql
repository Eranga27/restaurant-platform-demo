-- Phase 7: customer accounts (docs/DECISIONS.md D57 to D62): saved
-- addresses, loyalty points and reviews of completed orders.

-- ---------------------------------------------------------------------------
-- Saved addresses
-- ---------------------------------------------------------------------------

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (length(label) between 1 and 40),
  district text not null references public.districts (name),
  city text not null check (length(city) between 1 and 80),
  line text not null check (length(line) between 3 and 300),
  landmark text check (length(landmark) <= 200),
  lat double precision not null check (lat between 5.8 and 10.0),
  lng double precision not null check (lng between 79.5 and 82.0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- Ten addresses per account is plenty, and stops a script filling the table.
create or replace function public.limit_addresses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.addresses a where a.user_id = new.user_id) >= 10 then
    raise exception 'too_many_addresses' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger addresses_limit
  before insert on public.addresses
  for each row execute function public.limit_addresses();

-- ---------------------------------------------------------------------------
-- Loyalty points (docs/DECISIONS.md B2, D58)
-- ---------------------------------------------------------------------------

create table public.loyalty_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  points integer not null check (points <> 0),
  reason text not null check (reason in ('earned', 'redeemed', 'returned', 'adjusted')),
  note text check (length(note) <= 200),
  created_at timestamptz not null default now(),
  -- One of each per order, so retries and repeated triggers can't double up.
  unique (order_id, reason)
);

create index loyalty_ledger_user_idx on public.loyalty_ledger (user_id, created_at desc);

alter table public.orders
  add column loyalty_points_used integer not null default 0 check (loyalty_points_used >= 0),
  add column loyalty_discount_cents integer not null default 0 check (loyalty_discount_cents >= 0);

alter table public.orders drop constraint totals_add_up;
alter table public.orders add constraint totals_add_up check (
  total_cents = subtotal_cents - discount_cents - loyalty_discount_cents
    + service_charge_cents + vat_cents + delivery_fee_cents
);
alter table public.orders drop constraint discount_within_subtotal;
alter table public.orders add constraint discount_within_subtotal
  check (discount_cents + loyalty_discount_cents <= subtotal_cents);
-- Spending points needs an account: place_order() checks that. Not a table
-- check, because deleting an account keeps its orders with user_id null.

-- A customer's point balance.
create or replace function public.loyalty_balance(account uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.points), 0)::integer from public.loyalty_ledger l where l.user_id = account;
$$;

-- Points are earned when an order is completed, and spent points come back
-- when an order is rejected or cancelled (including unpaid online orders).
create or replace function public.loyalty_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  brand jsonb := coalesce((select s.brand from public.settings s where s.id = 1), '{}'::jsonb);
  enabled boolean := coalesce((brand #>> '{features,loyalty}')::boolean, true);
  per_point integer := coalesce((brand #>> '{loyalty,pointPerCents}')::integer, 10000);
  earned integer;
begin
  if new.user_id is null or new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'completed' and enabled and per_point > 0 then
    earned := (new.subtotal_cents - new.discount_cents - new.loyalty_discount_cents) / per_point;
    if earned > 0 then
      insert into public.loyalty_ledger (user_id, order_id, points, reason)
      values (new.user_id, new.id, earned, 'earned')
      on conflict (order_id, reason) do nothing;
    end if;
  elsif new.status in ('rejected', 'cancelled') and new.loyalty_points_used > 0 then
    insert into public.loyalty_ledger (user_id, order_id, points, reason)
    values (new.user_id, new.id, new.loyalty_points_used, 'returned')
    on conflict (order_id, reason) do nothing;
  end if;
  return new;
end;
$$;

create trigger orders_loyalty
  after update of status on public.orders
  for each row execute function public.loyalty_on_order_status();

-- place_order() now records redeemed points too: same function as Phase 2,
-- plus the loyalty columns and a balance check under a per-customer lock.
create or replace function public.place_order(payload jsonb)
returns table (order_id uuid, public_token text, order_number text, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  existing public.orders%rowtype;
  promo public.promo_codes%rowtype;
  used integer;
  new_order public.orders%rowtype;
  points integer := coalesce((payload ->> 'loyalty_points_used')::integer, 0);
begin
  select * into existing from public.orders o
  where o.idempotency_key = (payload ->> 'idempotency_key')::uuid;
  if found then
    return query select existing.id, existing.public_token, existing.order_number, false;
    return;
  end if;

  if payload ->> 'promo_code_id' is not null then
    -- Lock the code so concurrent orders can't exceed its redemption limit.
    select * into promo from public.promo_codes p
    where p.id = (payload ->> 'promo_code_id')::uuid
    for update;
    if not found or not promo.is_active then
      raise exception 'promo_unavailable' using errcode = 'P0001';
    end if;
    if promo.max_redemptions is not null then
      select count(*) into used from public.promo_redemptions r where r.promo_code_id = promo.id;
      if used >= promo.max_redemptions then
        raise exception 'promo_exhausted' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if points > 0 then
    if payload ->> 'user_id' is null then
      raise exception 'loyalty_needs_an_account' using errcode = 'P0001';
    end if;
    -- One order at a time per customer, so the same points can't be spent twice.
    perform pg_advisory_xact_lock(hashtext('loyalty:' || (payload ->> 'user_id')));
    if public.loyalty_balance((payload ->> 'user_id')::uuid) < points then
      raise exception 'loyalty_insufficient' using errcode = 'P0001';
    end if;
  end if;

  insert into public.orders (
    public_token, order_number, branch_id, user_id, customer_name, customer_phone, customer_email,
    type, scheduled_for, delivery_district, delivery_city, delivery_address, delivery_landmark,
    delivery_lat, delivery_lng, delivery_distance_km, notes, subtotal_cents, discount_cents,
    loyalty_points_used, loyalty_discount_cents,
    service_charge_cents, vat_cents, delivery_fee_cents, total_cents, promo_code_id,
    payment_method, idempotency_key, locale
  )
  select
    p.public_token, p.order_number, p.branch_id, p.user_id, p.customer_name, p.customer_phone, p.customer_email,
    p.type, p.scheduled_for, p.delivery_district, p.delivery_city, p.delivery_address, p.delivery_landmark,
    p.delivery_lat, p.delivery_lng, p.delivery_distance_km, p.notes, p.subtotal_cents, p.discount_cents,
    coalesce(p.loyalty_points_used, 0), coalesce(p.loyalty_discount_cents, 0),
    p.service_charge_cents, p.vat_cents, p.delivery_fee_cents, p.total_cents, p.promo_code_id,
    p.payment_method, p.idempotency_key, p.locale
  from jsonb_populate_record(null::public.orders, payload) as p
  returning * into new_order;

  insert into public.order_items (
    order_id, menu_item_id, name_i18n, unit_price_cents, quantity, options, spice_level,
    instructions, line_total_cents, sort_order
  )
  select
    new_order.id, i.menu_item_id, i.name_i18n, i.unit_price_cents, i.quantity, coalesce(i.options, '[]'::jsonb),
    i.spice_level, i.instructions, i.line_total_cents, i.sort_order
  from jsonb_populate_recordset(null::public.order_items, payload -> 'items') as i;

  if not exists (select 1 from public.order_items oi where oi.order_id = new_order.id) then
    raise exception 'order_has_no_items' using errcode = 'P0001';
  end if;

  if new_order.promo_code_id is not null then
    insert into public.promo_redemptions (promo_code_id, order_id, user_id, customer_phone)
    values (new_order.promo_code_id, new_order.id, new_order.user_id, new_order.customer_phone);
  end if;

  if new_order.loyalty_points_used > 0 then
    insert into public.loyalty_ledger (user_id, order_id, points, reason)
    values (new_order.user_id, new_order.id, -new_order.loyalty_points_used, 'redeemed');
  end if;

  return query select new_order.id, new_order.public_token, new_order.order_number, true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews of completed orders (moderated: D60)
-- ---------------------------------------------------------------------------

alter table public.reviews add column order_id uuid unique references public.orders (id) on delete set null;

-- A review from the order's tracking link, after it's completed. Server only.
-- One per order; it waits for an admin to approve it.
create or replace function public.submit_review(order_token text, stars smallint, review_body text, author text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  new_id uuid;
begin
  select * into o from public.orders x where x.public_token = order_token;
  if not found or o.status <> 'completed' then
    raise exception 'not_reviewable' using errcode = 'P0001';
  end if;
  if o.updated_at < now() - interval '60 days' then
    raise exception 'too_late' using errcode = 'P0001';
  end if;
  insert into public.reviews (branch_id, user_id, order_id, author_name, rating, body)
  values (o.branch_id, o.user_id, o.id, left(trim(author), 80), stars, left(trim(review_body), 1000))
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'already_reviewed' using errcode = 'P0001';
end;
$$;

-- Admins approve or reject, recording who and when.
create or replace function public.moderate_review(target uuid, decision text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision' using errcode = 'P0001';
  end if;
  update public.reviews
  set status = decision, moderated_at = now(), moderated_by = (select auth.uid())
  where id = target;
  return decision;
end;
$$;

create trigger reviews_audit after update on public.reviews
  for each row execute function public.audit_change();

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table public.addresses, public.loyalty_ledger from anon, authenticated;
grant select, insert, update, delete on table public.addresses to authenticated;
grant select on table public.loyalty_ledger to authenticated;

alter table public.addresses enable row level security;
alter table public.loyalty_ledger enable row level security;

create policy "Customers manage their own addresses" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Customers read their own points" on public.loyalty_ledger
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Approved reviews are public. The API returns only what the site shows, never
-- whose account wrote one (user_id). Signed-in roles also get order_id and
-- moderated_at for the admin screen; RLS still decides which rows anyone sees.
revoke select on table public.reviews from anon, authenticated;
grant select (id, branch_id, author_name, rating, body, status, created_at)
  on table public.reviews to anon;
grant select (id, branch_id, author_name, rating, body, status, created_at, order_id, moderated_at)
  on table public.reviews to authenticated;

revoke execute on function public.limit_addresses() from public, anon, authenticated;
revoke execute on function public.loyalty_on_order_status() from public, anon, authenticated;
revoke execute on function public.loyalty_balance(uuid) from public, anon, authenticated;
revoke execute on function public.submit_review(text, smallint, text, text) from public, anon, authenticated;
revoke execute on function public.moderate_review(uuid, text) from public, anon;

grant execute on function public.loyalty_balance(uuid) to service_role;
grant execute on function public.submit_review(text, smallint, text, text) to service_role;
grant execute on function public.moderate_review(uuid, text) to authenticated;
