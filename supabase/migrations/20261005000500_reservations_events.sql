-- Phase 5: table reservations and event enquiries (docs/DECISIONS.md D42 to D47).
--
-- As with orders, guests never write these tables directly: the server calls
-- service-role functions after validating the request, and staff change them
-- through functions that check their branch and role.

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  -- Private link to view or cancel the booking. Never sequential.
  public_token text not null unique check (public_token ~ '^[A-Za-z0-9_-]{32,64}$'),
  reference text not null unique check (reference ~ '^[A-Z0-9]{6}$'),
  branch_id uuid not null references public.branches (id),
  user_id uuid references auth.users (id) on delete set null,
  guest_name text not null check (length(guest_name) between 1 and 120),
  guest_phone text not null check (guest_phone ~ '^\+94[0-9]{9}$'),
  guest_email text check (length(guest_email) <= 254 and guest_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  party_size integer not null check (party_size between 1 and 50),
  seating text not null default 'any' check (seating in ('any', 'indoor', 'outdoor')),
  occasion text check (occasion in ('birthday', 'anniversary', 'business', 'other')),
  notes text check (length(notes) <= 500),
  status text not null default 'confirmed' check (
    status in ('confirmed', 'seated', 'completed', 'no_show', 'cancelled')
  ),
  cancelled_by text check (cancelled_by in ('guest', 'branch')),
  cancel_reason text check (length(cancel_reason) <= 300),
  idempotency_key uuid not null unique,
  locale text not null default 'en' check (locale in ('en', 'si', 'ta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_ends_after_it_starts check (ends_at > starts_at)
);

create index reservations_branch_starts_idx on public.reservations (branch_id, starts_at);
create index reservations_user_id_idx on public.reservations (user_id) where user_id is not null;

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Seats a branch already has booked at the busiest moment between two times.
create or replace function public.booked_seats(target_branch uuid, window_start timestamptz, window_end timestamptz)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(max(load), 0)::integer
  from (
    select (
      select coalesce(sum(r.party_size), 0)
      from public.reservations r
      where r.branch_id = target_branch
        and r.status in ('confirmed', 'seated')
        and r.starts_at <= moment.t
        and r.ends_at > moment.t
    ) as load
    from (
      select window_start as t
      union
      select r.starts_at
      from public.reservations r
      where r.branch_id = target_branch
        and r.status in ('confirmed', 'seated')
        and r.starts_at > window_start
        and r.starts_at < window_end
    ) as moment
  ) as loads;
$$;

-- Books a table if there's room, or raises 'fully_booked'. Called by server
-- code with the secret key after it has checked opening hours, notice and
-- party size; `seats_limit` is the branch's online share of its seats.
-- Bookings at a branch are serialised, so two people can't take the last
-- seats at once. Idempotent on idempotency_key.
create or replace function public.book_table(payload jsonb)
returns table (reservation_id uuid, public_token text, reference text, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  existing public.reservations%rowtype;
  request public.reservations%rowtype;
  booked integer;
  new_booking public.reservations%rowtype;
begin
  select * into existing from public.reservations r
  where r.idempotency_key = (payload ->> 'idempotency_key')::uuid;
  if found then
    return query select existing.id, existing.public_token, existing.reference, false;
    return;
  end if;

  request := jsonb_populate_record(null::public.reservations, payload);
  perform pg_advisory_xact_lock(hashtext('reservations:' || request.branch_id::text));

  booked := public.booked_seats(request.branch_id, request.starts_at, request.ends_at);
  if booked + request.party_size > (payload ->> 'seats_limit')::integer then
    raise exception 'fully_booked' using errcode = 'P0001';
  end if;

  insert into public.reservations (
    public_token, reference, branch_id, user_id, guest_name, guest_phone, guest_email,
    starts_at, ends_at, party_size, seating, occasion, notes, idempotency_key, locale
  ) values (
    request.public_token, request.reference, request.branch_id, request.user_id,
    request.guest_name, request.guest_phone, request.guest_email, request.starts_at,
    request.ends_at, request.party_size, coalesce(request.seating, 'any'), request.occasion,
    request.notes, request.idempotency_key, coalesce(request.locale, 'en')
  )
  returning * into new_booking;

  return query select new_booking.id, new_booking.public_token, new_booking.reference, true;
end;
$$;

-- A guest cancelling from their link, up to `notice_minutes` before their time.
create or replace function public.cancel_reservation_by_guest(booking_token text, notice_minutes integer)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with cancelled as (
    update public.reservations r
    set status = 'cancelled', cancelled_by = 'guest'
    where r.public_token = booking_token
      and r.status = 'confirmed'
      and r.starts_at > now() + make_interval(mins => notice_minutes)
    returning r.id
  )
  select exists (select 1 from cancelled);
$$;

-- Staff: seat a party, mark it finished or a no-show, or cancel (with a reason).
create or replace function public.update_reservation_status(target uuid, next_status text, reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reservations%rowtype;
  clean_reason text := nullif(left(trim(coalesce(reason, '')), 300), '');
begin
  select * into r from public.reservations where id = target for update;
  if not found or not public.is_branch_staff(r.branch_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not (
    (r.status = 'confirmed' and next_status in ('seated', 'no_show', 'cancelled'))
    or (r.status = 'seated' and next_status = 'completed')
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if next_status = 'cancelled' and clean_reason is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.reservations set
    status = next_status,
    cancelled_by = case when next_status = 'cancelled' then 'branch' else cancelled_by end,
    cancel_reason = case when next_status = 'cancelled' then clean_reason else cancel_reason end
  where id = target;
  return next_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- Event and catering enquiries
-- ---------------------------------------------------------------------------

create table public.event_inquiries (
  id uuid primary key default gen_random_uuid(),
  -- Private link to the enquiry: status, quote, accepting and the deposit.
  public_token text not null unique check (public_token ~ '^[A-Za-z0-9_-]{32,64}$'),
  reference text not null unique check (reference ~ '^[A-Z0-9]{6}$'),
  branch_id uuid not null references public.branches (id),
  user_id uuid references auth.users (id) on delete set null,
  contact_name text not null check (length(contact_name) between 1 and 120),
  contact_phone text not null check (contact_phone ~ '^\+94[0-9]{9}$'),
  contact_email text not null check (length(contact_email) <= 254 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  event_type text not null check (event_type in ('birthday', 'office', 'dana', 'wedding', 'homecoming', 'other')),
  -- At the branch, or catering delivered and served at the guest's venue.
  service text not null check (service in ('at_branch', 'catering')),
  event_date date not null,
  event_time time,
  guests integer not null check (guests between 1 and 5000),
  package_id text check (package_id ~ '^[a-z0-9-]{1,40}$'),
  budget_cents integer check (budget_cents >= 0),
  venue text check (length(venue) <= 300),
  notes text check (length(notes) <= 1000),
  status text not null default 'new' check (
    status in ('new', 'quoted', 'confirmed', 'done', 'declined', 'cancelled')
  ),
  quote_cents integer check (quote_cents > 0),
  deposit_cents integer check (deposit_cents >= 0),
  quote_notes text check (length(quote_notes) <= 1000),
  quoted_at timestamptz,
  quoted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  deposit_status text not null default 'none' check (
    deposit_status in ('none', 'pending', 'paid', 'refunded', 'charged_back')
  ),
  close_reason text check (length(close_reason) <= 300),
  idempotency_key uuid not null unique,
  locale text not null default 'en' check (locale in ('en', 'si', 'ta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catering_has_a_venue check (service <> 'catering' or venue is not null),
  constraint deposit_within_quote check (deposit_cents is null or deposit_cents <= quote_cents),
  constraint quoted_enquiries_have_a_quote check (status in ('new', 'declined', 'cancelled') or quote_cents is not null)
);

create index event_inquiries_branch_date_idx on public.event_inquiries (branch_id, event_date);
create index event_inquiries_user_id_idx on public.event_inquiries (user_id) where user_id is not null;

create trigger event_inquiries_set_updated_at
  before update on public.event_inquiries
  for each row execute function public.set_updated_at();

-- Managers of the branch, or admins.
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
  );
$$;

-- Records a new enquiry. Server only (secret key). Idempotent.
create or replace function public.create_event_inquiry(payload jsonb)
returns table (inquiry_id uuid, public_token text, reference text, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  existing public.event_inquiries%rowtype;
  new_inquiry public.event_inquiries%rowtype;
begin
  select * into existing from public.event_inquiries e
  where e.idempotency_key = (payload ->> 'idempotency_key')::uuid;
  if found then
    return query select existing.id, existing.public_token, existing.reference, false;
    return;
  end if;

  insert into public.event_inquiries (
    public_token, reference, branch_id, user_id, contact_name, contact_phone, contact_email,
    event_type, service, event_date, event_time, guests, package_id, budget_cents, venue, notes,
    idempotency_key, locale
  )
  select
    p.public_token, p.reference, p.branch_id, p.user_id, p.contact_name, p.contact_phone,
    p.contact_email, p.event_type, p.service, p.event_date, p.event_time, p.guests, p.package_id,
    p.budget_cents, p.venue, p.notes, p.idempotency_key, coalesce(p.locale, 'en')
  from jsonb_populate_record(null::public.event_inquiries, payload) as p
  returning * into new_inquiry;

  return query select new_inquiry.id, new_inquiry.public_token, new_inquiry.reference, true;
end;
$$;

-- Managers and admins send (or revise) a quote. A deposit of 0 means none.
create or replace function public.quote_event_inquiry(target uuid, quote integer, deposit integer, quote_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.event_inquiries%rowtype;
begin
  select * into e from public.event_inquiries where id = target for update;
  if not found or not public.is_branch_manager(e.branch_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if e.status not in ('new', 'quoted') or e.deposit_status = 'paid' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if quote is null or quote <= 0 or deposit is null or deposit < 0 or deposit > quote then
    raise exception 'invalid_quote' using errcode = 'P0001';
  end if;
  update public.event_inquiries set
    status = 'quoted',
    quote_cents = quote,
    deposit_cents = deposit,
    deposit_status = case when deposit > 0 then 'pending' else 'none' end,
    quote_notes = nullif(left(trim(coalesce(quote_note, '')), 1000), ''),
    quoted_at = now(),
    quoted_by = (select auth.uid()),
    -- A revised quote needs accepting again.
    accepted_at = null
  where id = target;
  return 'quoted';
end;
$$;

-- Managers and admins close or progress an enquiry by hand: decline it,
-- confirm it (e.g. a deposit paid at the branch), mark it done or cancel it.
create or replace function public.set_event_status(target uuid, next_status text, reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.event_inquiries%rowtype;
  clean_reason text := nullif(left(trim(coalesce(reason, '')), 300), '');
begin
  select * into e from public.event_inquiries where id = target for update;
  if not found or not public.is_branch_manager(e.branch_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not (
    (e.status in ('new', 'quoted') and next_status = 'declined')
    or (e.status = 'quoted' and next_status = 'confirmed')
    or (e.status = 'confirmed' and next_status in ('done', 'cancelled'))
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if next_status in ('declined', 'cancelled') and clean_reason is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.event_inquiries set
    status = next_status,
    close_reason = case when next_status in ('declined', 'cancelled') then clean_reason else close_reason end,
    accepted_at = case when next_status = 'confirmed' then coalesce(accepted_at, now()) else accepted_at end
  where id = target;
  return next_status;
end;
$$;

-- The guest accepts or declines a quote from their link. Server only.
-- Accepting confirms the event, unless a deposit is due: then it waits for
-- the deposit (paid online, or recorded by the branch).
create or replace function public.respond_to_quote(inquiry_token text, accept boolean)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  e public.event_inquiries%rowtype;
begin
  select * into e from public.event_inquiries i where i.public_token = inquiry_token for update;
  if not found or e.status <> 'quoted' then
    raise exception 'quote_not_open' using errcode = 'P0001';
  end if;
  if not accept then
    update public.event_inquiries i set status = 'cancelled', close_reason = 'Declined by the guest'
    where i.id = e.id;
    return 'cancelled';
  end if;
  update public.event_inquiries i set
    accepted_at = now(),
    status = case when coalesce(e.deposit_cents, 0) = 0 then 'confirmed' else 'quoted' end
  where i.id = e.id;
  return case when coalesce(e.deposit_cents, 0) = 0 then 'confirmed' else 'quoted' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deposits through PayHere
-- ---------------------------------------------------------------------------

alter table public.payments alter column order_id drop not null;
alter table public.payments
  add column event_inquiry_id uuid references public.event_inquiries (id) on delete cascade;
alter table public.payments add constraint payment_is_for_one_thing
  check ((order_id is null) <> (event_inquiry_id is null));
alter table public.payments add constraint payments_event_inquiry_attempt_key
  unique (event_inquiry_id, attempt);
create index payments_event_inquiry_id_idx on public.payments (event_inquiry_id)
  where event_inquiry_id is not null;

-- A new deposit attempt for an accepted quote. Server only.
create or replace function public.start_deposit_payment(inquiry_token text)
returns table (payment_id uuid, reference text, amount_cents integer)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  e public.event_inquiries%rowtype;
  next_attempt integer;
  new_payment public.payments%rowtype;
begin
  select * into e from public.event_inquiries i where i.public_token = inquiry_token for update;
  if not found then
    raise exception 'inquiry_not_found' using errcode = 'P0001';
  end if;
  if e.status <> 'quoted' or e.accepted_at is null or coalesce(e.deposit_cents, 0) = 0
    or e.deposit_status <> 'pending' then
    raise exception 'deposit_not_due' using errcode = 'P0001';
  end if;

  select coalesce(max(p.attempt), 0) + 1 into next_attempt
  from public.payments p where p.event_inquiry_id = e.id;
  if next_attempt > 10 then
    raise exception 'payment_attempts_exhausted' using errcode = 'P0001';
  end if;

  insert into public.payments (event_inquiry_id, attempt, reference, amount_cents)
  values (e.id, next_attempt, e.reference || '-' || next_attempt, e.deposit_cents)
  returning * into new_payment;

  return query select new_payment.id, new_payment.reference, new_payment.amount_cents;
end;
$$;

-- The notification handler now covers deposits too, and says which it was.
drop function public.apply_payhere_notification(jsonb);

create function public.apply_payhere_notification(payload jsonb)
returns table (outcome text, kind text, token text, payment_status text, status text)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  pay public.payments%rowtype;
  ord public.orders%rowtype;
  inq public.event_inquiries%rowtype;
  code integer := (payload ->> 'status_code')::integer;
  new_status text;
  closed boolean;
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
    return query select 'unknown_reference'::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if pay.order_id is not null then
    select * into ord from public.orders o where o.id = pay.order_id for update;
    closed := ord.status in ('cancelled', 'rejected');
  else
    select * into inq from public.event_inquiries i where i.id = pay.event_inquiry_id for update;
    closed := inq.status in ('declined', 'cancelled');
  end if;

  if payload ->> 'currency' is distinct from pay.currency
    or (payload ->> 'amount_cents')::integer is distinct from pay.amount_cents then
    result := 'amount_mismatch';
  elsif new_status = pay.status then
    result := 'duplicate';
  elsif pay.status = 'charged_back' or (pay.status = 'paid' and new_status <> 'charged_back') then
    -- A late or out-of-order notification can't undo a payment.
    result := 'ignored';
  elsif new_status = 'paid' and closed then
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

    if pay.order_id is not null then
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
    else
      if new_status = 'paid' then
        update public.event_inquiries i set
          deposit_status = 'paid',
          status = case when i.status = 'quoted' then 'confirmed' else i.status end
        where i.id = inq.id;
      elsif new_status = 'charged_back' then
        update public.event_inquiries i set deposit_status = 'charged_back' where i.id = inq.id;
      end if;
    end if;
  end if;

  if pay.order_id is not null then
    return query select result, 'order'::text, o.public_token, o.payment_status, o.status
    from public.orders o where o.id = ord.id;
  else
    return query select result, 'deposit'::text, i.public_token, i.deposit_status, i.status
    from public.event_inquiries i where i.id = inq.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table public.reservations, public.event_inquiries from anon, authenticated;
grant select on table public.reservations, public.event_inquiries to authenticated;

alter table public.reservations enable row level security;
alter table public.event_inquiries enable row level security;

create policy "Guests and branch staff read reservations" on public.reservations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_branch_staff(branch_id)));

create policy "Guests and branch staff read event enquiries" on public.event_inquiries
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_branch_staff(branch_id)));

revoke execute on function public.booked_seats(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.book_table(jsonb) from public, anon, authenticated;
revoke execute on function public.cancel_reservation_by_guest(text, integer) from public, anon, authenticated;
revoke execute on function public.create_event_inquiry(jsonb) from public, anon, authenticated;
revoke execute on function public.respond_to_quote(text, boolean) from public, anon, authenticated;
revoke execute on function public.start_deposit_payment(text) from public, anon, authenticated;
revoke execute on function public.apply_payhere_notification(jsonb) from public, anon, authenticated;
revoke execute on function public.update_reservation_status(uuid, text, text) from public, anon;
revoke execute on function public.quote_event_inquiry(uuid, integer, integer, text) from public, anon;
revoke execute on function public.set_event_status(uuid, text, text) from public, anon;
revoke execute on function public.is_branch_manager(uuid) from public, anon;

grant execute on function public.booked_seats(uuid, timestamptz, timestamptz) to service_role;
grant execute on function public.book_table(jsonb) to service_role;
grant execute on function public.cancel_reservation_by_guest(text, integer) to service_role;
grant execute on function public.create_event_inquiry(jsonb) to service_role;
grant execute on function public.respond_to_quote(text, boolean) to service_role;
grant execute on function public.start_deposit_payment(text) to service_role;
grant execute on function public.apply_payhere_notification(jsonb) to service_role;
grant execute on function public.update_reservation_status(uuid, text, text) to authenticated;
grant execute on function public.quote_event_inquiry(uuid, integer, integer, text) to authenticated;
grant execute on function public.set_event_status(uuid, text, text) to authenticated;
grant execute on function public.is_branch_manager(uuid) to authenticated;
