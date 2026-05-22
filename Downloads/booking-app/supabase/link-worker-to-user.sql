-- ============================================================
-- Прив'язати worker до твого Supabase auth user
-- ============================================================
-- Контекст: iOS застосунок знаходить твої роботи через ланцюжок:
--   auth.users.id = workers.user_id → bookings.worker_ids
-- Якщо workers.user_id порожній (NULL) — iOS показує "Clear day".
--
-- Цей скрипт оновлює ВСІ workers які належать твоєму бізнесу
-- і встановлює user_id для одного з них (першого по імені).
-- ============================================================

-- 1. Подивитися кого зараз треба прив'язати
select w.id, w.name, w.user_id, b.name as business
from public.workers w
join public.businesses b on b.id = w.business_id
where b.owner_id = auth.uid();

-- 2. Прив'язати конкретного worker до твого auth user.
--    Підстав email (рядок 1) і ID worker (рядок 2 — id з результату вище).
update public.workers
set user_id = (select id from auth.users where email = 'bernykzahar@gmail.com')
where id = 'WORKER_ID_З_РЕЗУЛЬТАТУ_ВИЩЕ';

-- 3. Перевірка — має повернути не NULL у user_id
select w.name, w.user_id, u.email
from public.workers w
left join auth.users u on u.id = w.user_id
where w.id = 'WORKER_ID_З_РЕЗУЛЬТАТУ_ВИЩЕ';
