-- ============================================================
-- Drevito v0.4 — Availability, Auto-slots, Leads
-- ============================================================
-- Цей міграційний файл додає:
--   1. business_hours (тижневий графік роботи)
--   2. time_off (одноразові блоки — відпустка, свято)
--   3. lead_requests (запити від AI чату або форми)
--   4. services.buffer_min (час між роботами)
--
-- Скрипт ідемпотентний — можна запускати скільки завгодно разів.
-- ============================================================

-- ---------- 1. Service buffer ----------
alter table public.services
  add column if not exists buffer_min integer not null default 15;

-- ---------- 2. Business hours ----------
-- Зберігаємо як JSON у businesses щоб не плодити join-и.
-- Структура: { "mon": {"open":9, "close":17, "enabled":true}, ... }
-- Дефолт — Mon-Fri 9-17.
alter table public.businesses
  add column if not exists schedule jsonb not null default
    '{
      "mon": {"open": 9, "close": 17, "enabled": true},
      "tue": {"open": 9, "close": 17, "enabled": true},
      "wed": {"open": 9, "close": 17, "enabled": true},
      "thu": {"open": 9, "close": 17, "enabled": true},
      "fri": {"open": 9, "close": 17, "enabled": true},
      "sat": {"open": 9, "close": 14, "enabled": false},
      "sun": {"open": 0, "close": 0, "enabled": false}
    }'::jsonb;

-- Default slot duration (мінімальний крок слотів у picker, минут)
alter table public.businesses
  add column if not exists slot_minutes integer not null default 30;

-- ---------- 3. Time off (відпустка, свята, hold) ----------
create table if not exists public.time_off (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  reason       text,
  worker_id    uuid references public.workers(id) on delete cascade,  -- null = весь бізнес
  created_at   timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists time_off_business_idx on public.time_off(business_id, start_at);
create index if not exists time_off_worker_idx on public.time_off(worker_id);

-- RLS — manager бачить і керує тільки своїм бізнесом
alter table public.time_off enable row level security;

do $$ begin
  drop policy if exists "time_off_select_public"  on public.time_off;
  drop policy if exists "time_off_manager_all"    on public.time_off;
end $$;

-- Публіка може ЧИТАТИ time_off (потрібно щоб /book/:slug міг показати "blocked" слоти)
create policy "time_off_select_public" on public.time_off for select using (true);

create policy "time_off_manager_all" on public.time_off for all
using (
  business_id in (select id from public.businesses where owner_id = auth.uid())
  or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
)
with check (
  business_id in (select id from public.businesses where owner_id = auth.uid())
  or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
);

-- ---------- 4. Lead requests ----------
-- Записуються коли клієнт завершує AI чат або заповнює "Request callback" форму,
-- БЕЗ підтвердженого слоту. Менеджер бачить їх у дашборді → конвертує у booking.

create table if not exists public.lead_requests (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  customer_name   text not null,
  customer_phone  text,
  customer_email  text,
  address         text,
  service_id      uuid references public.services(id) on delete set null,
  message         text,
  source          text not null default 'chat',  -- 'chat' | 'form' | 'phone'
  status          text not null default 'new',   -- 'new' | 'contacted' | 'converted' | 'dismissed'
  preferred_time  timestamptz,                   -- якщо клієнт назвав конкретний день/час
  transcript      jsonb,                         -- повна історія чату (для AI запитів)
  booking_id      uuid references public.bookings(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists leads_business_status_idx on public.lead_requests(business_id, status, created_at desc);

alter table public.lead_requests enable row level security;

do $$ begin
  drop policy if exists "leads_insert_public"   on public.lead_requests;
  drop policy if exists "leads_manager_select"  on public.lead_requests;
  drop policy if exists "leads_manager_update"  on public.lead_requests;
  drop policy if exists "leads_manager_delete"  on public.lead_requests;
end $$;

-- Анонім може створити lead (з AI чату / форми) для будь-якого бізнесу
create policy "leads_insert_public" on public.lead_requests for insert
with check (exists (select 1 from public.businesses where id = business_id));

-- Manager (owner or worker.is_manager) бачить leads свого бізнесу
create policy "leads_manager_select" on public.lead_requests for select
using (
  business_id in (select id from public.businesses where owner_id = auth.uid())
  or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
);

create policy "leads_manager_update" on public.lead_requests for update
using (
  business_id in (select id from public.businesses where owner_id = auth.uid())
  or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
);

create policy "leads_manager_delete" on public.lead_requests for delete
using (
  business_id in (select id from public.businesses where owner_id = auth.uid())
  or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
);

-- ---------- 5. updated_at trigger для leads ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_leads_updated_at on public.lead_requests;
create trigger set_leads_updated_at
  before update on public.lead_requests
  for each row execute function public.set_updated_at();
