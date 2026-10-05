-- Phase 4: the branch dashboard (docs/DECISIONS.md D35 to D40).
--
-- Staff never write orders or availability directly: each change goes through
-- a function that checks the caller's branch and the allowed next steps, and
-- records who acted. Live board updates are broadcast on a per-branch topic
-- whose name is a secret only the server hands to signed-in staff.

-- ---------------------------------------------------------------------------
-- Private per-branch settings
-- ---------------------------------------------------------------------------

create table public.branch_secrets (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  -- Names the branch's live board topic (staff:<key>). Random, never public.
  realtime_key text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  -- Telegram chat for new-order alerts (optional, docs/DECISIONS.md D39).
  telegram_chat_id text check (telegram_chat_id ~ '^-?[0-9]{5,20}$'),
  updated_at timestamptz not null default now()
);

create trigger branch_secrets_set_updated_at
  before update on public.branch_secrets
  for each row execute function public.set_updated_at();

insert into public.branch_secrets (branch_id) select id from public.branches
on conflict do nothing;

create or replace function public.create_branch_secrets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.branch_secrets (branch_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger branches_create_secrets
  after insert on public.branches
  for each row execute function public.create_branch_secrets();

-- ---------------------------------------------------------------------------
-- Live board broadcasts
-- ---------------------------------------------------------------------------

-- Tells the branch's board that an order changed. The payload is the order's
-- ID and status only; the board reloads the details through RLS.
create or replace function public.broadcast_branch_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  topic_key text;
begin
  if tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.payment_status is distinct from old.payment_status then
    select s.realtime_key into topic_key from public.branch_secrets s where s.branch_id = new.branch_id;
    if topic_key is null then
      return new;
    end if;
    begin
      perform realtime.send(
        jsonb_build_object('orderId', new.id, 'status', new.status, 'paymentStatus', new.payment_status),
        'order',
        'staff:' || topic_key,
        false
      );
    exception when others then
      raise warning 'branch order broadcast failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger orders_broadcast_branch
  after insert or update of status, payment_status on public.orders
  for each row execute function public.broadcast_branch_order();

-- Cancellation reasons are recorded as well as rejection reasons.
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_events (order_id, status, actor_id, reason)
    values (
      new.id,
      new.status,
      (select auth.uid()),
      case when new.status in ('rejected', 'cancelled') then new.rejection_reason end
    );
  end if;
  return new;
end;
$$;

-- A rejected or cancelled order gives its promo code use back.
create or replace function public.release_promo_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('rejected', 'cancelled') and old.status is distinct from new.status then
    delete from public.promo_redemptions r where r.order_id = new.id;
  end if;
  return new;
end;
$$;

create trigger orders_release_promo
  after update of status on public.orders
  for each row execute function public.release_promo_redemption();

-- ---------------------------------------------------------------------------
-- update_order_status(): how staff move an order along
-- ---------------------------------------------------------------------------

create or replace function public.update_order_status(target uuid, next_status text, reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  allowed text[];
  clean_reason text := nullif(left(trim(coalesce(reason, '')), 300), '');
begin
  select * into o from public.orders where id = target for update;
  if not found or not public.is_branch_staff(o.branch_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  allowed := case o.status
    when 'received' then array['accepted', 'rejected']
    when 'accepted' then
      case when o.type = 'delivery'
        then array['preparing', 'out_for_delivery', 'cancelled']
        else array['preparing', 'ready', 'cancelled'] end
    when 'preparing' then
      case when o.type = 'delivery'
        then array['out_for_delivery', 'cancelled']
        else array['ready', 'cancelled'] end
    when 'ready' then array['completed', 'cancelled']
    when 'out_for_delivery' then array['completed']
    else array[]::text[]
  end;
  if not (next_status = any (allowed)) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if next_status in ('rejected', 'cancelled') and clean_reason is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  update public.orders set
    status = next_status,
    rejection_reason = case when next_status in ('rejected', 'cancelled') then clean_reason else rejection_reason end,
    -- Cash is collected when the order is handed over.
    payment_status = case
      when next_status = 'completed' and payment_method = 'cod' then 'paid'
      else payment_status end
  where id = target;
  return next_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- Availability and pausing orders
-- ---------------------------------------------------------------------------

-- Staff used to be able to write branch_menu_overrides directly, which would
-- have let them change a branch's prices too. Now only admins write the table;
-- staff change availability through this function.
drop policy "Branch staff add availability for their branch" on public.branch_menu_overrides;
drop policy "Branch staff change availability for their branch" on public.branch_menu_overrides;

create policy "Admins add availability overrides" on public.branch_menu_overrides
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins change availability overrides" on public.branch_menu_overrides
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.set_item_availability(target_branch uuid, item uuid, available boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_branch_staff(target_branch) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.branch_menu_overrides (branch_id, menu_item_id, is_available, updated_by)
  values (target_branch, item, available, (select auth.uid()))
  on conflict (branch_id, menu_item_id) do update
    set is_available = excluded.is_available, updated_by = excluded.updated_by;
  return available;
end;
$$;

create or replace function public.set_branch_accepting_orders(target_branch uuid, accepting boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_branch_staff(target_branch) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.branches set is_accepting_orders = accepting where id = target_branch;
  return accepting;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-reject (docs/DECISIONS.md B6)
-- ---------------------------------------------------------------------------

-- Rejects orders the branch hasn't accepted in time: "as soon as possible"
-- orders after settings.brand.orders.autoRejectMinutes (default 10; 0 turns
-- it off) since they reached the branch, and scheduled orders 15 minutes
-- before their time. Returns how many it rejected.
create or replace function public.auto_reject_unaccepted_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  minutes integer := coalesce(
    (select (s.brand #>> '{orders,autoRejectMinutes}')::integer from public.settings s where s.id = 1),
    10
  );
  rejected integer;
begin
  if minutes <= 0 then
    return 0;
  end if;

  with due as (
    select o.id
    from public.orders o
    where o.status = 'received'
      and (
        (o.scheduled_for is null and coalesce(
          (select max(e.created_at) from public.order_status_events e
           where e.order_id = o.id and e.status = 'received'),
          o.created_at
        ) < now() - make_interval(mins => minutes))
        or (o.scheduled_for is not null and o.scheduled_for < now() + interval '15 minutes')
      )
  ),
  done as (
    update public.orders o
    set status = 'rejected', rejection_reason = 'The branch didn''t confirm the order in time.'
    from due where o.id = due.id
    returning o.id
  )
  select count(*)::integer into rejected from done;
  return rejected;
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('auto-reject-orders', '* * * * *', 'select public.auto_reject_unaccepted_orders()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Web Push subscriptions (new-order alerts on staff devices)
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table public.branch_secrets, public.push_subscriptions from anon, authenticated;
grant select, insert, delete on table public.push_subscriptions to authenticated;

alter table public.branch_secrets enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "Users see their own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Staff add their own push subscriptions" on public.push_subscriptions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('staff', 'manager', 'admin')
    )
  );
create policy "Users remove their own push subscriptions" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.create_branch_secrets() from public, anon, authenticated;
revoke execute on function public.broadcast_branch_order() from public, anon, authenticated;
revoke execute on function public.release_promo_redemption() from public, anon, authenticated;
revoke execute on function public.auto_reject_unaccepted_orders() from public, anon, authenticated;
revoke execute on function public.update_order_status(uuid, text, text) from public, anon;
revoke execute on function public.set_item_availability(uuid, uuid, boolean) from public, anon;
revoke execute on function public.set_branch_accepting_orders(uuid, boolean) from public, anon;

-- Signed-in users may call these; each checks the caller's branch itself.
grant execute on function public.update_order_status(uuid, text, text) to authenticated;
grant execute on function public.set_item_availability(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_branch_accepting_orders(uuid, boolean) to authenticated;
grant execute on function public.auto_reject_unaccepted_orders() to service_role;
