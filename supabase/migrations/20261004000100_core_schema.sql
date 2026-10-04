-- Core schema for Phase 1: roles and profiles, branches, the menu, promotions,
-- holidays, reviews and settings.
--
-- Security model (docs/SECURITY.md):
--   * RLS is enabled on every table, and table privileges are revoked from the
--     API roles first, then granted back explicitly. Nothing is reachable by
--     default.
--   * Public visitors (anon) can read only what the website shows.
--   * Writes to the catalogue are admin-only. Order and payment tables arrive
--     in later migrations and are written only by server code (service role).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- A translatable text value: {"en": "...", "si": "...", "ta": "..."}.
-- English is required unless `required` is false; other keys are rejected.
create or replace function public.is_i18n_text(value jsonb, required boolean default true)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- coalesce: a check constraint that evaluates to NULL passes, so a missing
  -- key must yield false, not NULL.
  select coalesce(
    jsonb_typeof(value) = 'object'
      and (not required or jsonb_typeof(value -> 'en') = 'string')
      and not exists (
        select 1
        from jsonb_each(value) as entry
        where entry.key not in ('en', 'si', 'ta')
          or jsonb_typeof(entry.value) <> 'string'
      ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.districts (
  name text primary key,
  province text not null,
  sort_order integer not null default 0
);

comment on table public.districts is 'The 25 administrative districts of Sri Lanka, for address forms.';

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  address_line text not null check (length(address_line) between 1 and 200),
  city text not null check (length(city) between 1 and 80),
  district text not null references public.districts (name),
  lat double precision not null check (lat between 5.8 and 10.0),
  lng double precision not null check (lng between 79.5 and 82.0),
  phone text not null check (phone ~ '^\+94[0-9]{9}$'),
  whatsapp text check (whatsapp ~ '^\+94[0-9]{9}$'),
  email text check (email ~ '^[^@\s]+@[^@\s]+$'),
  delivery_radius_km numeric(4, 1) not null default 5 check (delivery_radius_km between 0 and 50),
  -- {"baseFeeCents": 25000, "includedKm": 3, "perKmCents": 6000, "freeAboveCents": 750000}
  delivery_fee_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(delivery_fee_rules) = 'object'),
  -- {"mon": [["11:00", "22:30"]], ..., "sun": [...]} in Asia/Colombo time
  opening_hours jsonb not null check (jsonb_typeof(opening_hours) = 'object'),
  seating_capacity integer not null default 40 check (seating_capacity >= 0),
  image_path text,
  is_accepting_orders boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger branches_set_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles and profiles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('customer', 'staff', 'manager', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (length(full_name) <= 120),
  phone text check (phone ~ '^\+94[0-9]{9}$'),
  role public.app_role not null default 'customer',
  branch_id uuid references public.branches (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_staff_have_a_branch
    check (role not in ('staff', 'manager') or branch_id is not null)
);

create index profiles_branch_id_idx on public.profiles (branch_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a customer profile. Only the display name is taken
-- from user-supplied metadata; the role is never read from it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 120));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role checks for RLS policies. SECURITY DEFINER so policies on other tables
-- can read profiles without granting broad access to it. Each only reveals
-- facts about the calling user.
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
  );
$$;

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
      and (p.role = 'admin' or (p.role in ('staff', 'manager') and p.branch_id = target_branch))
  );
$$;

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  description_i18n jsonb not null default '{}'::jsonb check (public.is_i18n_text(description_i18n, false)),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  description_i18n jsonb not null default '{}'::jsonb check (public.is_i18n_text(description_i18n, false)),
  base_price_cents integer not null check (base_price_cents between 0 and 100000000),
  image_path text,
  dietary_tags text[] not null default '{}'
    check (dietary_tags <@ array['vegetarian', 'vegan', 'halal', 'contains-nuts']),
  spice_selectable boolean not null default false,
  is_alcohol boolean not null default false,
  is_signature boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_category_id_idx on public.menu_items (category_id);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- Option groups on an item: a required single choice (portion) or optional
-- multiple choices (add-ons).
create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  selection text not null check (selection in ('single', 'multiple')),
  is_required boolean not null default false,
  max_select integer check (max_select > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index item_options_menu_item_id_idx on public.item_options (menu_item_id);

create trigger item_options_set_updated_at
  before update on public.item_options
  for each row execute function public.set_updated_at();

create table public.item_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.item_options (id) on delete cascade,
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  price_delta_cents integer not null default 0 check (price_delta_cents between -100000000 and 100000000),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index item_option_values_option_id_idx on public.item_option_values (option_id);

create trigger item_option_values_set_updated_at
  before update on public.item_option_values
  for each row execute function public.set_updated_at();

-- Per-branch price and availability ("sold out"). No row = base price, available.
create table public.branch_menu_overrides (
  branch_id uuid not null references public.branches (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  price_cents integer check (price_cents between 0 and 100000000),
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (branch_id, menu_item_id)
);

create index branch_menu_overrides_menu_item_id_idx on public.branch_menu_overrides (menu_item_id);

create trigger branch_menu_overrides_set_updated_at
  before update on public.branch_menu_overrides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Promotions, holidays, reviews, settings
-- ---------------------------------------------------------------------------

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_i18n jsonb not null check (public.is_i18n_text(title_i18n)),
  body_i18n jsonb not null default '{}'::jsonb check (public.is_i18n_text(body_i18n, false)),
  image_path text,
  cta_label_i18n jsonb check (cta_label_i18n is null or public.is_i18n_text(cta_label_i18n)),
  -- Internal links only.
  cta_href text check (cta_href ~ '^/[A-Za-z0-9/_#?=&-]*$'),
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_dates_in_order check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind text not null check (kind in ('poya', 'public', 'festival')),
  name_i18n jsonb not null check (public.is_i18n_text(name_i18n)),
  -- Poya days: no alcohol is served or sold.
  is_alcohol_free boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, kind)
);

create index holidays_date_idx on public.holidays (date);

create trigger holidays_set_updated_at
  before update on public.holidays
  for each row execute function public.set_updated_at();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null check (length(author_name) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (length(body) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_at timestamptz,
  moderated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_status_created_at_idx on public.reviews (status, created_at desc);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Single row of brand overrides merged over src/config/brand.ts at runtime.
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  brand jsonb not null default '{}'::jsonb check (jsonb_typeof(brand) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges: revoke everything, then grant back only what is needed.
-- ---------------------------------------------------------------------------

revoke all on table
  public.districts, public.branches, public.profiles, public.categories, public.menu_items,
  public.item_options, public.item_option_values, public.branch_menu_overrides,
  public.promotions, public.holidays, public.reviews, public.settings
from anon, authenticated;

-- Public catalogue: readable by everyone (RLS filters rows).
grant select on table
  public.districts, public.branches, public.categories, public.menu_items,
  public.item_options, public.item_option_values, public.branch_menu_overrides,
  public.promotions, public.holidays, public.reviews, public.settings
to anon, authenticated;

-- Signed-in users may attempt writes; RLS allows only admins (and branch staff
-- for availability).
grant insert, update, delete on table
  public.branches, public.categories, public.menu_items, public.item_options,
  public.item_option_values, public.branch_menu_overrides, public.promotions,
  public.holidays, public.reviews
to authenticated;
grant update on table public.settings to authenticated;

-- Profiles: users read their own and may change only their name and phone.
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.districts enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_options enable row level security;
alter table public.item_option_values enable row level security;
alter table public.branch_menu_overrides enable row level security;
alter table public.promotions enable row level security;
alter table public.holidays enable row level security;
alter table public.reviews enable row level security;
alter table public.settings enable row level security;

-- districts
create policy "Anyone can read districts" on public.districts
  for select to anon, authenticated using (true);

-- branches
create policy "Anyone can read active branches" on public.branches
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Admins manage branches" on public.branches
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles
create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- categories
create policy "Anyone can read active categories" on public.categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Admins manage categories" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- menu_items
create policy "Anyone can read active menu items" on public.menu_items
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Admins manage menu items" on public.menu_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- item_options: visible when the parent item is (menu_items RLS applies in the subquery)
create policy "Anyone can read options of visible items" on public.item_options
  for select to anon, authenticated
  using (exists (select 1 from public.menu_items m where m.id = item_options.menu_item_id));
create policy "Admins manage item options" on public.item_options
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- item_option_values
create policy "Anyone can read active option values" on public.item_option_values
  for select to anon, authenticated
  using (
    (is_active or (select public.is_admin()))
    and exists (select 1 from public.item_options o where o.id = item_option_values.option_id)
  );
create policy "Admins manage option values" on public.item_option_values
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- branch_menu_overrides: public (it is what the menu shows); branch staff edit their own branch
create policy "Anyone can read menu availability" on public.branch_menu_overrides
  for select to anon, authenticated using (true);
create policy "Branch staff add availability for their branch" on public.branch_menu_overrides
  for insert to authenticated with check ((select public.is_branch_staff(branch_id)));
create policy "Branch staff change availability for their branch" on public.branch_menu_overrides
  for update to authenticated
  using ((select public.is_branch_staff(branch_id)))
  with check ((select public.is_branch_staff(branch_id)));
create policy "Admins remove availability overrides" on public.branch_menu_overrides
  for delete to authenticated using ((select public.is_admin()));

-- promotions: live ones are public
create policy "Anyone can read running promotions" on public.promotions
  for select to anon, authenticated
  using (
    (
      is_active
      and (starts_on is null or starts_on <= (now() at time zone 'Asia/Colombo')::date)
      and (ends_on is null or ends_on >= (now() at time zone 'Asia/Colombo')::date)
    )
    or (select public.is_admin())
  );
create policy "Admins manage promotions" on public.promotions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- holidays
create policy "Anyone can read holidays" on public.holidays
  for select to anon, authenticated using (true);
create policy "Admins manage holidays" on public.holidays
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- reviews: approved ones are public; authors see their own
create policy "Anyone can read approved reviews" on public.reviews
  for select to anon, authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins moderate reviews" on public.reviews
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- settings
create policy "Anyone can read settings" on public.settings
  for select to anon, authenticated using (true);
create policy "Admins change settings" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Static reference rows
-- ---------------------------------------------------------------------------

insert into public.districts (name, province, sort_order) values
  ('Colombo', 'Western', 1),
  ('Gampaha', 'Western', 2),
  ('Kalutara', 'Western', 3),
  ('Kandy', 'Central', 4),
  ('Matale', 'Central', 5),
  ('Nuwara Eliya', 'Central', 6),
  ('Galle', 'Southern', 7),
  ('Matara', 'Southern', 8),
  ('Hambantota', 'Southern', 9),
  ('Jaffna', 'Northern', 10),
  ('Kilinochchi', 'Northern', 11),
  ('Mannar', 'Northern', 12),
  ('Vavuniya', 'Northern', 13),
  ('Mullaitivu', 'Northern', 14),
  ('Batticaloa', 'Eastern', 15),
  ('Ampara', 'Eastern', 16),
  ('Trincomalee', 'Eastern', 17),
  ('Kurunegala', 'North Western', 18),
  ('Puttalam', 'North Western', 19),
  ('Anuradhapura', 'North Central', 20),
  ('Polonnaruwa', 'North Central', 21),
  ('Badulla', 'Uva', 22),
  ('Monaragala', 'Uva', 23),
  ('Ratnapura', 'Sabaragamuwa', 24),
  ('Kegalle', 'Sabaragamuwa', 25);

insert into public.settings (id) values (1);
