-- Phase 3: online payments through PayHere (docs/DECISIONS.md D28 to D33).
--
-- An order paid online starts as 'awaiting_payment' and only reaches the
-- branch ('received') once PayHere's signed server notification confirms the
-- payment. Each trip to PayHere is a row in `payments`, so a failed or
-- cancelled payment can be retried. Every verified notification is kept.

-- ---------------------------------------------------------------------------
-- Order statuses
-- ---------------------------------------------------------------------------

alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in (
    'awaiting_payment', 'received', 'accepted', 'preparing', 'ready', 'out_for_delivery',
    'completed', 'rejected', 'cancelled'
  )
);

alter table public.order_status_events drop constraint order_status_events_status_check;
alter table public.order_status_events add constraint order_status_events_status_check check (
  status in (
    'awaiting_payment', 'received', 'accepted', 'preparing', 'ready', 'out_for_delivery',
    'completed', 'rejected', 'cancelled'
  )
);

alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (
  payment_status in ('pending', 'paid', 'failed', 'refunded', 'charged_back')
);

-- The starting status follows from the payment method, whoever inserts the row.
create or replace function public.set_initial_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := case when new.payment_method = 'payhere' then 'awaiting_payment' else 'received' end;
  new.payment_status := 'pending';
  return new;
end;
$$;

create trigger orders_set_initial_status
  before insert on public.orders
  for each row execute function public.set_initial_order_status();

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'payhere' check (provider in ('payhere')),
  attempt integer not null check (attempt between 1 and 10),
  -- Sent to PayHere as its order_id: the order number and the attempt, e.g. NEXC7N-2.
  reference text not null unique check (reference ~ '^[A-Z0-9]{6}-[0-9]{1,2}$'),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'LKR' check (currency = 'LKR'),
  status text not null default 'initiated' check (
    status in ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'charged_back')
  ),
  provider_payment_id text check (length(provider_payment_id) <= 64),
  method text check (length(method) <= 32),
  status_message text check (length(status_message) <= 300),
  -- True once a notification with a valid signature has been applied.
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, attempt)
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Notifications whose signature verified, as received (minus card details).
create table public.payment_notifications (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments (id) on delete set null,
  reference text not null,
  status_code integer not null,
  outcome text not null check (
    outcome in ('applied', 'duplicate', 'ignored', 'amount_mismatch', 'unknown_reference', 'paid_after_cancel')
  ),
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index payment_notifications_payment_id_idx on public.payment_notifications (payment_id);

-- ---------------------------------------------------------------------------
-- start_payment(): a new attempt for an order that is waiting for payment
-- ---------------------------------------------------------------------------

create or replace function public.start_payment(order_token text)
returns table (payment_id uuid, reference text, amount_cents integer)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  ord public.orders%rowtype;
  next_attempt integer;
  new_payment public.payments%rowtype;
begin
  select * into ord from public.orders o where o.public_token = order_token for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if ord.status <> 'awaiting_payment' or ord.payment_status = 'paid' then
    raise exception 'payment_not_needed' using errcode = 'P0001';
  end if;

  select coalesce(max(p.attempt), 0) + 1 into next_attempt
  from public.payments p where p.order_id = ord.id;
  if next_attempt > 10 then
    raise exception 'payment_attempts_exhausted' using errcode = 'P0001';
  end if;

  insert into public.payments (order_id, attempt, reference, amount_cents)
  values (ord.id, next_attempt, ord.order_number || '-' || next_attempt, ord.total_cents)
  returning * into new_payment;

  if ord.payment_status = 'failed' then
    update public.orders o set payment_status = 'pending' where o.id = ord.id;
  end if;

  return query select new_payment.id, new_payment.reference, new_payment.amount_cents;
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_payhere_notification(): the only way a payment becomes 'paid'
-- ---------------------------------------------------------------------------

-- Called by the notify endpoint (src/app/api/payments/payhere/notify) only
-- after it has checked the merchant ID and the md5sig signature. Checks the
-- amount and currency against the stored attempt, ignores repeats and
-- out-of-order notifications, then updates the payment and the order together.
--
-- payload: {reference, payment_id, amount_cents, currency, status_code,
--           method, status_message, raw}
create or replace function public.apply_payhere_notification(payload jsonb)
returns table (outcome text, order_token text, payment_status text, order_status text)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  pay public.payments%rowtype;
  ord public.orders%rowtype;
  code integer := (payload ->> 'status_code')::integer;
  new_status text;
  result text;
begin
  new_status := case code
    when 2 then 'paid'
    when 0 then 'pending'
    when -1 then 'cancelled'
    when -2 then 'failed'
    when -3 then 'charged_back'
  end;
  if new_status is null then
    raise exception 'unknown_status_code' using errcode = 'P0001';
  end if;

  select * into pay from public.payments p where p.reference = payload ->> 'reference' for update;
  if not found then
    insert into public.payment_notifications (payment_id, reference, status_code, outcome, payload)
    values (null, payload ->> 'reference', code, 'unknown_reference', coalesce(payload -> 'raw', '{}'::jsonb));
    return query select 'unknown_reference'::text, null::text, null::text, null::text;
    return;
  end if;

  select * into ord from public.orders o where o.id = pay.order_id for update;

  if payload ->> 'currency' is distinct from pay.currency
    or (payload ->> 'amount_cents')::integer is distinct from pay.amount_cents then
    result := 'amount_mismatch';
  elsif new_status = pay.status then
    result := 'duplicate';
  elsif pay.status = 'charged_back' or (pay.status = 'paid' and new_status <> 'charged_back') then
    -- A late or out-of-order notification can't undo a payment.
    result := 'ignored';
  elsif new_status = 'paid' and ord.status in ('cancelled', 'rejected') then
    result := 'paid_after_cancel';
  else
    result := 'applied';
  end if;

  insert into public.payment_notifications (payment_id, reference, status_code, outcome, payload)
  values (pay.id, pay.reference, code, result, coalesce(payload -> 'raw', '{}'::jsonb));

  if result in ('applied', 'paid_after_cancel') then
    update public.payments p set
      status = new_status,
      provider_payment_id = coalesce(payload ->> 'payment_id', p.provider_payment_id),
      method = coalesce(payload ->> 'method', p.method),
      status_message = coalesce(left(payload ->> 'status_message', 300), p.status_message),
      verified = true
    where p.id = pay.id;

    if new_status = 'paid' then
      -- Also covers a customer who switched to cash while PayHere was still
      -- processing: the online payment wins.
      update public.orders o set
        payment_status = 'paid',
        payment_method = 'payhere',
        status = case when o.status = 'awaiting_payment' then 'received' else o.status end
      where o.id = ord.id;
    elsif new_status = 'charged_back' then
      update public.orders o set payment_status = 'charged_back' where o.id = ord.id;
    elsif new_status in ('failed', 'cancelled') and ord.payment_status = 'pending'
      and ord.payment_method = 'payhere' then
      update public.orders o set payment_status = 'failed' where o.id = ord.id;
    end if;
  end if;

  return query
  select result, o.public_token, o.payment_status, o.status
  from public.orders o where o.id = ord.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Paying in cash instead, and expiring unpaid orders
-- ---------------------------------------------------------------------------

-- Lets a customer whose online payment failed pay on delivery or at pickup.
-- Returns false when the order is no longer waiting for payment.
create or replace function public.pay_on_delivery_instead(order_token text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with switched as (
    update public.orders o set payment_method = 'cod', payment_status = 'pending', status = 'received'
    where o.public_token = order_token
      and o.status = 'awaiting_payment'
      and o.payment_status <> 'paid'
      and not exists (
        select 1 from public.payments p where p.order_id = o.id and p.status = 'pending'
      )
    returning o.id
  )
  select exists (select 1 from switched);
$$;

-- Cancels online-payment orders nobody paid for, and gives their promo
-- redemptions back. Leaves orders with a payment PayHere reports as pending,
-- or a payment started in the last 15 minutes. Returns how many it cancelled.
create or replace function public.expire_unpaid_orders(older_than interval default '30 minutes')
returns integer
language sql
security invoker
set search_path = ''
as $$
  with expired as (
    update public.orders o set status = 'cancelled', payment_status = 'failed'
    where o.status = 'awaiting_payment'
      and o.payment_status <> 'paid'
      and o.created_at < now() - older_than
      and not exists (
        select 1 from public.payments p
        where p.order_id = o.id
          and (p.status = 'pending' or (p.status = 'initiated' and p.created_at > now() - interval '15 minutes'))
      )
    returning o.id
  ),
  released as (
    delete from public.promo_redemptions r using expired e where r.order_id = e.id
  )
  select count(*)::integer from expired;
$$;

-- Every five minutes where pg_cron is available (Supabase); tests skip it.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('expire-unpaid-orders', '*/5 * * * *', 'select public.expire_unpaid_orders()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table public.payments, public.payment_notifications from anon, authenticated;
grant select on table public.payments, public.payment_notifications to authenticated;

alter table public.payments enable row level security;
alter table public.payment_notifications enable row level security;

create policy "Admins can read payments" on public.payments
  for select to authenticated using ((select public.is_admin()));

create policy "Admins can read payment notifications" on public.payment_notifications
  for select to authenticated using ((select public.is_admin()));

revoke execute on function public.set_initial_order_status() from public, anon, authenticated;
revoke execute on function public.start_payment(text) from public, anon, authenticated;
revoke execute on function public.apply_payhere_notification(jsonb) from public, anon, authenticated;
revoke execute on function public.pay_on_delivery_instead(text) from public, anon, authenticated;
revoke execute on function public.expire_unpaid_orders(interval) from public, anon, authenticated;

grant execute on function public.start_payment(text) to service_role;
grant execute on function public.apply_payhere_notification(jsonb) to service_role;
grant execute on function public.pay_on_delivery_instead(text) to service_role;
grant execute on function public.expire_unpaid_orders(interval) to service_role;
