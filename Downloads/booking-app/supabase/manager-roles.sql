-- ============================================================
-- Etap 1: Manager / Worker ролі
-- ============================================================
-- Логіка ролей:
--   businesses.owner_id  → завжди Manager (creator бізнесу)
--   workers.user_id      → якщо є, цей worker може логінитись
--   workers.is_manager   → якщо true, цей worker теж має manager
--                          права (може створювати bookings, керувати
--                          іншими workers, тощо)
--
-- iOS застосунок при логіні:
--   1. Якщо auth.uid() = business.owner_id → Manager mode
--   2. Якщо worker.user_id = auth.uid() AND worker.is_manager → Manager mode
--   3. Якщо worker.user_id = auth.uid() → Worker mode
--   4. Інакше → "Not linked" screen
-- ============================================================

-- 1. Додати поле is_manager у workers
alter table public.workers
  add column if not exists is_manager boolean not null default false;

-- 2. Owner бізнесу автоматично має manager роль — додати тригер який створює
--    worker рядок для owner якщо його немає
create or replace function public.ensure_owner_worker()
returns trigger
language plpgsql
security definer
as $$
declare
  owner_email text;
begin
  -- Знайти email owner з auth.users
  select email into owner_email from auth.users where id = new.owner_id;

  -- Створити worker рядок для owner якщо ще немає
  insert into public.workers (business_id, user_id, name, email, role, is_manager, color)
  values (
    new.id,
    new.owner_id,
    coalesce(owner_email, 'Owner'),
    owner_email,
    'Owner',
    true,
    '#F4A93C'
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trigger_ensure_owner_worker on public.businesses;
create trigger trigger_ensure_owner_worker
  after insert on public.businesses
  for each row
  execute function public.ensure_owner_worker();

-- 3. Зробити те саме для ІСНУЮЧИХ businesses (one-time backfill)
insert into public.workers (business_id, user_id, name, email, role, is_manager, color)
select
  b.id,
  b.owner_id,
  coalesce(u.email, 'Owner'),
  u.email,
  'Owner',
  true,
  '#F4A93C'
from public.businesses b
left join auth.users u on u.id = b.owner_id
where not exists (
  select 1 from public.workers w
  where w.business_id = b.id and w.user_id = b.owner_id
);

-- 4. RLS: тільки manager може змінювати is_manager у workers
--    Звичайний worker не може сам собі поставити is_manager = true
do $$ begin
  drop policy if exists "workers_promote_demote" on public.workers;
end $$;

-- Manager (owner або worker з is_manager=true) може робити все з workers свого бізнесу
create policy "workers_manager_all" on public.workers for all
using (
  business_id in (
    select id from public.businesses where owner_id = auth.uid()
  )
  or business_id in (
    select business_id from public.workers
    where user_id = auth.uid() and is_manager = true
  )
)
with check (
  business_id in (
    select id from public.businesses where owner_id = auth.uid()
  )
  or business_id in (
    select business_id from public.workers
    where user_id = auth.uid() and is_manager = true
  )
);

-- Звичайний worker може читати свій рядок (для iOS, щоб дізнатися is_manager)
-- цей policy вже існує з основного schema.sql (workers_select_self)
