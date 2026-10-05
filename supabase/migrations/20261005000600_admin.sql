-- Phase 6: the admin panel (docs/DECISIONS.md D49 to D55).
--
-- Admin and manager rights now need a session that has passed TOTP MFA
-- (Supabase reports it as aal2). Every change to the catalogue, branches,
-- promotions, settings and staff roles is written to an audit log.

-- ---------------------------------------------------------------------------
-- MFA-aware role checks
-- ---------------------------------------------------------------------------

-- True when this session verified a TOTP code (authenticator assurance level 2).
create or replace function public.has_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = (select auth.uid())),
    false
  ) and public.has_mfa();
$$;

-- Staff need no MFA; managers and admins do (D49).
create or replace function public.is_branch_staff(target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        (p.role = 'admin' and public.has_mfa())
        or (p.role = 'manager' and p.branch_id = target_branch and public.has_mfa())
        or (p.role = 'staff' and p.branch_id = target_branch)
      )
  );
$$;

create or replace function public.is_branch_manager(target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (p.role = 'admin' or (p.role = 'manager' and p.branch_id = target_branch))
  ) and public.has_mfa();
$$;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null,
  entity_id text,
  -- Whole rows for catalogue changes; only the changed fields elsewhere.
  before jsonb,
  after jsonb,
  -- As reported by the app server (x-client-ip), for actions made through it.
  ip text check (length(ip) <= 64),
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

create or replace function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  row_ jsonb := coalesce(new_row, old_row);
  changed_keys text[];
  -- Tables holding guests' personal details: record only what changed.
  diff_only boolean := tg_table_name in ('profiles', 'reservations', 'event_inquiries', 'branch_secrets');
  headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key) into changed_keys
    from jsonb_each(new_row) n
    where n.value is distinct from old_row -> n.key and n.key not in ('updated_at', 'realtime_key');
    if changed_keys is null then
      return new;
    end if;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after, ip)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(row_ ->> 'id', (row_ ->> 'branch_id') || ':' || (row_ ->> 'menu_item_id')),
    case
      when tg_op = 'UPDATE' then (select jsonb_object_agg(k, old_row -> k) from unnest(changed_keys) k)
      when tg_op = 'DELETE' and not diff_only then old_row
    end,
    case
      when tg_op = 'UPDATE' then (select jsonb_object_agg(k, new_row -> k) from unnest(changed_keys) k)
      when tg_op = 'INSERT' and not diff_only then new_row
    end,
    left(headers ->> 'x-client-ip', 64)
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'branches', 'categories', 'menu_items', 'item_options', 'item_option_values',
    'branch_menu_overrides', 'promotions', 'holidays', 'promo_codes', 'settings'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- Staff decisions on guests' bookings and enquiries, and role changes.
create trigger reservations_audit after update on public.reservations
  for each row execute function public.audit_change();
create trigger event_inquiries_audit after update on public.event_inquiries
  for each row execute function public.audit_change();
create trigger branch_secrets_audit after update on public.branch_secrets
  for each row execute function public.audit_change();
create trigger profiles_audit after update of role, branch_id on public.profiles
  for each row execute function public.audit_change();

-- ---------------------------------------------------------------------------
-- Staff management
-- ---------------------------------------------------------------------------

-- Admins give someone a role (and a branch for staff and managers). Admins
-- can't change their own role, and the last admin can't be removed.
create or replace function public.set_staff_role(target_user uuid, new_role public.app_role, branch uuid default null)
returns public.app_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role_ public.app_role;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'cannot_change_own_role' using errcode = 'P0001';
  end if;
  select p.role into current_role_ from public.profiles p where p.id = target_user for update;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if new_role in ('staff', 'manager') and branch is null then
    raise exception 'branch_required' using errcode = 'P0001';
  end if;
  if current_role_ = 'admin' and new_role <> 'admin'
    and (select count(*) from public.profiles p where p.role = 'admin') <= 1 then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  update public.profiles
  set role = new_role, branch_id = case when new_role in ('staff', 'manager') then branch end
  where id = target_user;
  return new_role;
end;
$$;

-- Everyone with a staff role, with their email (admins only).
create or replace function public.admin_staff_list()
returns table (user_id uuid, email text, full_name text, role public.app_role, branch_id uuid, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select p.id, u.email::text, p.full_name, p.role, p.branch_id, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role <> 'customer'
  order by p.role, p.full_name;
end;
$$;

-- An existing account by email, to make it staff (admins only).
create or replace function public.admin_find_user(lookup_email text)
returns table (user_id uuid, email text, full_name text, role public.app_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select p.id, u.email::text, p.full_name, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(lookup_email));
end;
$$;

-- ---------------------------------------------------------------------------
-- Refunds (recorded here, made in the PayHere merchant portal: D53)
-- ---------------------------------------------------------------------------

alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check check (
  status in ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'charged_back', 'refunded')
);
alter table public.payments add column refunded_at timestamptz;
alter table public.payments add column refunded_by uuid references auth.users (id) on delete set null;
alter table public.payments add column refund_note text check (length(refund_note) <= 300);

create or replace function public.mark_payment_refunded(target uuid, note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into pay from public.payments where id = target for update;
  if not found or pay.status <> 'paid' then
    raise exception 'not_refundable' using errcode = 'P0001';
  end if;
  update public.payments set
    status = 'refunded',
    refunded_at = now(),
    refunded_by = (select auth.uid()),
    refund_note = nullif(left(trim(coalesce(note, '')), 300), '')
  where id = target;
  if pay.order_id is not null then
    update public.orders set payment_status = 'refunded' where id = pay.order_id;
  else
    update public.event_inquiries set deposit_status = 'refunded' where id = pay.event_inquiry_id;
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
  values ((select auth.uid()), 'update', 'payments', target::text,
          jsonb_build_object('status', 'paid'), jsonb_build_object('status', 'refunded', 'note', note));
  return 'refunded';
end;
$$;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

-- Sales between two Sri Lanka calendar dates, optionally for one branch:
-- revenue by day and by branch, top dishes, order types and payment methods.
-- Counts orders that reached the branch and weren't rejected or cancelled.
create or replace function public.admin_sales_report(from_date date, to_date date, branch uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if to_date < from_date or to_date - from_date > 366 then
    raise exception 'invalid_range' using errcode = 'P0001';
  end if;

  with sold as (
    select o.*, (o.created_at at time zone 'Asia/Colombo')::date as day
    from public.orders o
    where o.status not in ('awaiting_payment', 'rejected', 'cancelled')
      and (o.created_at at time zone 'Asia/Colombo')::date between from_date and to_date
      and (branch is null or o.branch_id = branch)
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'orders', count(*),
        'revenueCents', coalesce(sum(total_cents), 0),
        'averageCents', coalesce(round(avg(total_cents)), 0)
      ) from sold
    ),
    'byDay', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'orders', d.orders, 'revenueCents', d.revenue) order by d.day)
      from (
        select g.day::date as day, count(s.id) as orders, coalesce(sum(s.total_cents), 0) as revenue
        from generate_series(from_date, to_date, interval '1 day') as g(day)
        left join sold s on s.day = g.day::date
        group by g.day
      ) d
    ), '[]'::jsonb),
    'byBranch', coalesce((
      select jsonb_agg(jsonb_build_object('branchId', b.branch_id, 'orders', b.orders, 'revenueCents', b.revenue) order by b.revenue desc)
      from (select branch_id, count(*) as orders, sum(total_cents) as revenue from sold group by branch_id) b
    ), '[]'::jsonb),
    'byType', coalesce((
      select jsonb_object_agg(t.type, t.orders) from (select type, count(*) as orders from sold group by type) t
    ), '{}'::jsonb),
    'byPayment', coalesce((
      select jsonb_object_agg(p.payment_method, p.orders)
      from (select payment_method, count(*) as orders from sold group by payment_method) p
    ), '{}'::jsonb),
    'topItems', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity, 'revenueCents', i.revenue) order by i.quantity desc)
      from (
        select oi.name_i18n ->> 'en' as name, sum(oi.quantity) as quantity, sum(oi.line_total_cents) as revenue
        from public.order_items oi join sold s on s.id = oi.order_id
        group by oi.name_i18n ->> 'en'
        order by sum(oi.quantity) desc
        limit 10
      ) i
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Image storage (menu, branches, promotions)
-- ---------------------------------------------------------------------------

-- Public bucket: images are served to everyone. Uploads go through the
-- server with the secret key after an admin check, so no API role may write.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;
alter table public.audit_logs enable row level security;
create policy "Admins read the audit log" on public.audit_logs
  for select to authenticated using ((select public.is_admin()));

-- Admins see every branch's secrets (Telegram chat) through the server only.
revoke execute on function public.audit_change() from public, anon, authenticated;
revoke execute on function public.has_mfa() from public, anon;
revoke execute on function public.set_staff_role(uuid, public.app_role, uuid) from public, anon;
revoke execute on function public.admin_staff_list() from public, anon;
revoke execute on function public.admin_find_user(text) from public, anon;
revoke execute on function public.mark_payment_refunded(uuid, text) from public, anon;
revoke execute on function public.admin_sales_report(date, date, uuid) from public, anon;

grant execute on function public.has_mfa() to authenticated;
grant execute on function public.set_staff_role(uuid, public.app_role, uuid) to authenticated;
grant execute on function public.admin_staff_list() to authenticated;
grant execute on function public.admin_find_user(text) to authenticated;
grant execute on function public.mark_payment_refunded(uuid, text) to authenticated;
grant execute on function public.admin_sales_report(date, date, uuid) to authenticated;
