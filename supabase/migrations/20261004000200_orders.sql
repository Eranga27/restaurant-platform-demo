-- Phase 2: cities, promo codes, orders, order items, status history, live
-- status broadcasts and the place_order() function.
--
-- Security model (docs/SECURITY.md):
--   * Orders are written only by server code using the secret key, through
--     public.place_order(). The browser never inserts or updates an order.
--   * Customers can read their own orders (account history, Phase 7); branch
--     staff can read their branch's orders (dashboard, Phase 4). Guests reach
--     their order only through its unguessable public token, on the server.
--   * Promo codes are not readable through the API, so they can't be listed.

-- ---------------------------------------------------------------------------
-- Cities (reference data for address forms)
-- ---------------------------------------------------------------------------

create table public.cities (
  district text not null references public.districts (name),
  name text not null check (length(name) between 1 and 80),
  primary key (district, name)
);

-- ---------------------------------------------------------------------------
-- Promo codes
-- ---------------------------------------------------------------------------

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  description_i18n jsonb not null default '{}'::jsonb check (public.is_i18n_text(description_i18n, false)),
  kind text not null check (kind in ('percent', 'fixed')),
  percent_bps integer check (percent_bps between 1 and 10000),
  amount_cents integer check (amount_cents > 0),
  min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  max_discount_cents integer check (max_discount_cents > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_value_matches_kind check (
    (kind = 'percent' and percent_bps is not null and amount_cents is null)
    or (kind = 'fixed' and amount_cents is not null and percent_bps is null)
  ),
  constraint promo_dates_in_order check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create trigger promo_codes_set_updated_at
  before update on public.promo_codes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Long random token in the tracking URL. Never sequential.
  public_token text not null unique check (public_token ~ '^[A-Za-z0-9_-]{32,64}$'),
  -- Short reference read out over the phone. Not used for access.
  order_number text not null unique check (order_number ~ '^[A-Z0-9]{6}$'),
  branch_id uuid not null references public.branches (id),
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null check (length(customer_name) between 1 and 120),
  customer_phone text not null check (customer_phone ~ '^\+94[0-9]{9}$'),
  customer_email text check (length(customer_email) <= 254 and customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  type text not null check (type in ('delivery', 'pickup')),
  status text not null default 'received' check (
    status in ('received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'rejected', 'cancelled')
  ),
  scheduled_for timestamptz,
  delivery_district text references public.districts (name),
  delivery_city text check (length(delivery_city) <= 80),
  delivery_address text check (length(delivery_address) <= 300),
  delivery_landmark text check (length(delivery_landmark) <= 200),
  delivery_lat double precision check (delivery_lat between 5.8 and 10.0),
  delivery_lng double precision check (delivery_lng between 79.5 and 82.0),
  delivery_distance_km numeric(6, 2) check (delivery_distance_km >= 0),
  notes text check (length(notes) <= 500),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  service_charge_cents integer not null check (service_charge_cents >= 0),
  vat_cents integer not null check (vat_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  promo_code_id uuid references public.promo_codes (id),
  payment_method text not null check (payment_method in ('cod', 'payhere')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  -- One order per checkout attempt, even if the request is retried.
  idempotency_key uuid not null unique,
  locale text not null default 'en' check (locale in ('en', 'si', 'ta')),
  rejection_reason text check (length(rejection_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_orders_have_an_address check (
    type <> 'delivery'
    or (delivery_address is not null and delivery_district is not null and delivery_lat is not null and delivery_lng is not null)
  ),
  constraint totals_add_up check (
    total_cents = subtotal_cents - discount_cents + service_charge_cents + vat_cents + delivery_fee_cents
  ),
  constraint discount_within_subtotal check (discount_cents <= subtotal_cents)
);

create index orders_branch_created_idx on public.orders (branch_id, created_at desc);
create index orders_user_id_idx on public.orders (user_id) where user_id is not null;
create index orders_status_idx on public.orders (status) where status in ('received', 'accepted', 'preparing', 'ready', 'out_for_delivery');

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  -- Snapshots: the order keeps what was bought even if the menu changes.
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 50),
  -- [{"option": {"en": ...}, "value": {"en": ...}, "priceDeltaCents": 0}]
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  spice_level text check (spice_level in ('mild', 'medium', 'hot')),
  instructions text check (length(instructions) <= 200),
  line_total_cents integer not null,
  sort_order integer not null default 0,
  constraint line_total_matches check (line_total_cents = unit_price_cents * quantity)
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null check (
    status in ('received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'rejected', 'cancelled')
  ),
  actor_id uuid references auth.users (id) on delete set null,
  reason text check (length(reason) <= 300),
  created_at timestamptz not null default now()
);

create index order_status_events_order_idx on public.order_status_events (order_id, created_at);

create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  customer_phone text not null,
  created_at timestamptz not null default now()
);

create index promo_redemptions_code_idx on public.promo_redemptions (promo_code_id);

-- ---------------------------------------------------------------------------
-- Status history and live broadcasts
-- ---------------------------------------------------------------------------

-- Every status change is recorded, with the acting user when there is one.
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
      case when new.status = 'rejected' then new.rejection_reason end
    );
  end if;
  return new;
end;
$$;

create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- Pushes status changes to the tracking page over Supabase Realtime. The topic
-- contains the unguessable token, so only someone holding the tracking link
-- can listen, and the payload carries no personal data.
create or replace function public.broadcast_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.payment_status is distinct from old.payment_status then
    begin
      perform realtime.send(
        jsonb_build_object(
          'status', new.status,
          'paymentStatus', new.payment_status,
          'updatedAt', new.updated_at
        ),
        'status',
        'order:' || new.public_token,
        false
      );
    exception when others then
      -- A live update is a nicety; it must never stop an order being saved.
      raise warning 'order status broadcast failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger orders_broadcast_status
  after insert or update of status, payment_status on public.orders
  for each row execute function public.broadcast_order_status();

-- ---------------------------------------------------------------------------
-- place_order(): the only way an order is created
-- ---------------------------------------------------------------------------

-- Called by server code with the secret key after it has validated and priced
-- the order (src/lib/orders). Atomic: the order, its items, the first status
-- event and the promo redemption are written together or not at all.
-- Idempotent: a retried request with the same key returns the existing order.
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

  insert into public.orders (
    public_token, order_number, branch_id, user_id, customer_name, customer_phone, customer_email,
    type, scheduled_for, delivery_district, delivery_city, delivery_address, delivery_landmark,
    delivery_lat, delivery_lng, delivery_distance_km, notes, subtotal_cents, discount_cents,
    service_charge_cents, vat_cents, delivery_fee_cents, total_cents, promo_code_id,
    payment_method, idempotency_key, locale
  )
  select
    p.public_token, p.order_number, p.branch_id, p.user_id, p.customer_name, p.customer_phone, p.customer_email,
    p.type, p.scheduled_for, p.delivery_district, p.delivery_city, p.delivery_address, p.delivery_landmark,
    p.delivery_lat, p.delivery_lng, p.delivery_distance_km, p.notes, p.subtotal_cents, p.discount_cents,
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

  return query select new_order.id, new_order.public_token, new_order.order_number, true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table
  public.cities, public.promo_codes, public.orders, public.order_items,
  public.order_status_events, public.promo_redemptions
from anon, authenticated;

revoke execute on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;
revoke execute on function public.log_order_status() from public, anon, authenticated;
revoke execute on function public.broadcast_order_status() from public, anon, authenticated;

grant select on table public.cities to anon, authenticated;
grant select on table public.orders, public.order_items, public.order_status_events to authenticated;
grant select, insert, update, delete on table public.promo_codes to authenticated;
grant select on table public.promo_redemptions to authenticated;

alter table public.cities enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.promo_redemptions enable row level security;

create policy "Anyone can read cities" on public.cities
  for select to anon, authenticated using (true);

create policy "Admins manage promo codes" on public.promo_codes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Customers and branch staff read orders" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_branch_staff(branch_id)));

create policy "Read items of visible orders" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

create policy "Read history of visible orders" on public.order_status_events
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_status_events.order_id));

create policy "Admins read promo redemptions" on public.promo_redemptions
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Reference rows: main towns in each district (free text is also accepted)
-- ---------------------------------------------------------------------------

insert into public.cities (district, name)
select district, unnest(towns) from (values
  ('Colombo', array['Colombo 01 (Fort)', 'Colombo 02 (Slave Island)', 'Colombo 03 (Kollupitiya)', 'Colombo 04 (Bambalapitiya)', 'Colombo 05 (Havelock Town)', 'Colombo 06 (Wellawatte)', 'Colombo 07 (Cinnamon Gardens)', 'Colombo 08 (Borella)', 'Colombo 09 (Dematagoda)', 'Colombo 10 (Maradana)', 'Colombo 11 (Pettah)', 'Colombo 12 (Hulftsdorp)', 'Colombo 13 (Kotahena)', 'Colombo 14 (Grandpass)', 'Colombo 15 (Mattakkuliya)', 'Athurugiriya', 'Avissawella', 'Battaramulla', 'Boralesgamuwa', 'Dehiwala', 'Hanwella', 'Homagama', 'Kaduwela', 'Kesbewa', 'Kolonnawa', 'Kottawa', 'Maharagama', 'Malabe', 'Mirihana', 'Moratuwa', 'Mount Lavinia', 'Nawala', 'Nugegoda', 'Padukka', 'Pannipitiya', 'Piliyandala', 'Rajagiriya', 'Ratmalana', 'Sri Jayawardenepura Kotte', 'Wellampitiya']),
  ('Gampaha', array['Divulapitiya', 'Gampaha', 'Ja-Ela', 'Kadawatha', 'Kandana', 'Kelaniya', 'Kiribathgoda', 'Minuwangoda', 'Mirigama', 'Negombo', 'Nittambuwa', 'Ragama', 'Seeduwa', 'Veyangoda', 'Wattala']),
  ('Kalutara', array['Aluthgama', 'Bandaragama', 'Beruwala', 'Horana', 'Ingiriya', 'Kalutara', 'Matugama', 'Panadura', 'Wadduwa']),
  ('Kandy', array['Akurana', 'Digana', 'Gampola', 'Kadugannawa', 'Kandy', 'Katugastota', 'Kundasale', 'Nawalapitiya', 'Peradeniya', 'Pilimathalawa', 'Teldeniya']),
  ('Matale', array['Dambulla', 'Galewela', 'Matale', 'Naula', 'Rattota', 'Sigiriya', 'Ukuwela']),
  ('Nuwara Eliya', array['Ginigathhena', 'Hatton', 'Kotagala', 'Maskeliya', 'Nanu Oya', 'Nuwara Eliya', 'Talawakele', 'Walapane']),
  ('Galle', array['Ambalangoda', 'Baddegama', 'Bentota', 'Elpitiya', 'Galle', 'Habaraduwa', 'Hikkaduwa', 'Karapitiya', 'Koggala', 'Unawatuna']),
  ('Matara', array['Akuressa', 'Deniyaya', 'Dikwella', 'Hakmana', 'Kamburupitiya', 'Matara', 'Mirissa', 'Weligama']),
  ('Hambantota', array['Ambalantota', 'Beliatta', 'Hambantota', 'Tangalle', 'Tissamaharama', 'Weeraketiya']),
  ('Jaffna', array['Chavakachcheri', 'Chunnakam', 'Jaffna', 'Kayts', 'Kopay', 'Nallur', 'Point Pedro', 'Tellippalai']),
  ('Kilinochchi', array['Kilinochchi', 'Pallai', 'Paranthan', 'Poonakary']),
  ('Mannar', array['Madhu', 'Mannar', 'Murunkan', 'Pesalai', 'Talaimannar']),
  ('Vavuniya', array['Cheddikulam', 'Nedunkeni', 'Omanthai', 'Vavuniya']),
  ('Mullaitivu', array['Mankulam', 'Mullaitivu', 'Oddusuddan', 'Puthukudiyiruppu']),
  ('Batticaloa', array['Batticaloa', 'Eravur', 'Kalkudah', 'Kaluwanchikudy', 'Kattankudy', 'Valaichchenai']),
  ('Ampara', array['Akkaraipattu', 'Ampara', 'Arugam Bay', 'Dehiattakandiya', 'Kalmunai', 'Pottuvil', 'Sammanthurai', 'Uhana']),
  ('Trincomalee', array['Kantale', 'Kinniya', 'Kuchchaveli', 'Mutur', 'Nilaveli', 'Trincomalee']),
  ('Kurunegala', array['Alawwa', 'Ibbagamuwa', 'Kuliyapitiya', 'Kurunegala', 'Maho', 'Narammala', 'Nikaweratiya', 'Pannala', 'Polgahawela', 'Wariyapola']),
  ('Puttalam', array['Anamaduwa', 'Chilaw', 'Dankotuwa', 'Kalpitiya', 'Marawila', 'Nattandiya', 'Puttalam', 'Wennappuwa']),
  ('Anuradhapura', array['Anuradhapura', 'Eppawala', 'Habarana', 'Kebithigollewa', 'Kekirawa', 'Medawachchiya', 'Mihintale', 'Thambuttegama']),
  ('Polonnaruwa', array['Dimbulagala', 'Hingurakgoda', 'Kaduruwela', 'Medirigiriya', 'Minneriya', 'Polonnaruwa']),
  ('Badulla', array['Badulla', 'Bandarawela', 'Ella', 'Hali-Ela', 'Haputale', 'Mahiyanganaya', 'Passara', 'Welimada']),
  ('Monaragala', array['Bibile', 'Buttala', 'Kataragama', 'Monaragala', 'Siyambalanduwa', 'Wellawaya']),
  ('Ratnapura', array['Balangoda', 'Eheliyagoda', 'Embilipitiya', 'Kahawatta', 'Kuruwita', 'Pelmadulla', 'Ratnapura']),
  ('Kegalle', array['Deraniyagala', 'Kegalle', 'Kitulgala', 'Mawanella', 'Pinnawala', 'Rambukkana', 'Ruwanwella', 'Warakapola'])
) as d (district, towns);
