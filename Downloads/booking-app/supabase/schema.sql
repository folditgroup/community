-- Fieldbase schema for Supabase Postgres.
-- Paste this entire file into the Supabase SQL editor and run once.
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ---------- tables ----------

create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  slug          text not null unique,
  type          text not null default 'landscaping',
  email         text,
  phone         text,
  city          text,
  hours         jsonb not null default '{"start":7,"end":18}'::jsonb,
  workdays      jsonb not null default '[1,2,3,4,5,6]'::jsonb,
  brand_accent  text default '#F4A93C',
  created_at    timestamptz not null default now()
);

-- Public profile / marketplace columns (added in v0.3). Safe to re-run.
alter table public.businesses
  add column if not exists description        text,
  add column if not exists tagline            text,
  add column if not exists hero_image_url     text,
  add column if not exists avatar_url         text,
  add column if not exists website_url        text,
  add column if not exists instagram          text,
  add column if not exists is_public          boolean not null default true,
  add column if not exists accepting_bookings boolean not null default true;

create unique index if not exists businesses_owner_unique on public.businesses(owner_id);
create index        if not exists businesses_public_type_idx on public.businesses(is_public, type);

-- Offers / promotions a business can show on its public profile + directory.
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  title           text not null,
  description     text,
  price           numeric,
  original_price  numeric,
  valid_until     date,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists offers_business_idx on public.offers(business_id);

create table if not exists public.workers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  role         text,
  email        text,
  phone        text,
  color        text default '#3F3F37',
  skills       text[] not null default '{}',
  hire_date    date,
  created_at   timestamptz not null default now()
);

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  address      text,
  tags         text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  duration_min  integer not null default 60,
  base_price    numeric not null default 0,
  unit          text not null default 'visit',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete set null,
  service_id   uuid references public.services(id) on delete set null,
  worker_ids   uuid[] not null default '{}',
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  address      text,
  price        numeric not null default 0,
  tip          numeric not null default 0,
  notes        text,
  status       text not null default 'scheduled',
  created_at   timestamptz not null default now()
);

-- Ensure tip exists on pre-existing installs (idempotent).
alter table public.bookings add column if not exists tip numeric not null default 0;

create index if not exists bookings_business_start_idx on public.bookings(business_id, start_at);

-- ---------- Row Level Security ----------

alter table public.businesses enable row level security;
alter table public.workers    enable row level security;
alter table public.clients    enable row level security;
alter table public.services   enable row level security;
alter table public.bookings   enable row level security;
alter table public.offers     enable row level security;

-- Helper: drop existing policy if present, used by re-runs.
do $$ begin
  -- businesses
  drop policy if exists "businesses_select_public"  on public.businesses;
  drop policy if exists "businesses_insert_own"     on public.businesses;
  drop policy if exists "businesses_update_own"     on public.businesses;
  drop policy if exists "businesses_delete_own"     on public.businesses;
  -- services
  drop policy if exists "services_select_public"    on public.services;
  drop policy if exists "services_write_own"        on public.services;
  -- workers
  drop policy if exists "workers_all_own"           on public.workers;
  -- clients
  drop policy if exists "clients_insert_public"     on public.clients;
  drop policy if exists "clients_select_own"        on public.clients;
  drop policy if exists "clients_update_own"        on public.clients;
  drop policy if exists "clients_delete_own"        on public.clients;
  -- bookings
  drop policy if exists "bookings_insert_public"    on public.bookings;
  drop policy if exists "bookings_select_own"       on public.bookings;
  drop policy if exists "bookings_update_own"       on public.bookings;
  drop policy if exists "bookings_delete_own"       on public.bookings;
  -- offers
  drop policy if exists "offers_select_public"      on public.offers;
  drop policy if exists "offers_write_own"          on public.offers;
end $$;

-- businesses
-- Public can read businesses by slug (needed for /book/:slug page).
create policy "businesses_select_public" on public.businesses
  for select using (true);

create policy "businesses_insert_own" on public.businesses
  for insert with check (owner_id = auth.uid());

create policy "businesses_update_own" on public.businesses
  for update using (owner_id = auth.uid());

create policy "businesses_delete_own" on public.businesses
  for delete using (owner_id = auth.uid());

-- services
-- Public can read active services (needed for booking page).
create policy "services_select_public" on public.services
  for select using (true);

create policy "services_write_own" on public.services
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- workers — owner only.
create policy "workers_all_own" on public.workers
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- clients — public can insert (for booking page), owner reads/writes.
create policy "clients_insert_public" on public.clients
  for insert with check (
    business_id in (select id from public.businesses)
  );
create policy "clients_select_own" on public.clients
  for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "clients_update_own" on public.clients
  for update using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "clients_delete_own" on public.clients
  for delete using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- bookings — same pattern: anonymous insert allowed, owner can read/write.
create policy "bookings_insert_public" on public.bookings
  for insert with check (
    business_id in (select id from public.businesses)
  );
create policy "bookings_select_own" on public.bookings
  for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "bookings_update_own" on public.bookings
  for update using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "bookings_delete_own" on public.bookings
  for delete using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- offers — public read of active offers (for directory + profile), owner full CRUD.
create policy "offers_select_public" on public.offers
  for select using (true);

create policy "offers_write_own" on public.offers
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
