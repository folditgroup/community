-- ============================================================
-- Fix: дозволити анонімам створювати clients і bookings
-- через публічну /book/:slug сторінку
-- ============================================================
-- Раніше у нас було subquery `business_id in (select id from public.businesses)`,
-- що теоретично спрацьовує бо businesses мають публічний read policy.
-- Але в деяких випадках Supabase оптимізатор може не повернути дані
-- для анонімного юзера через RLS recursion guard.
--
-- Цей патч робить правило простішим і явним:
-- "якщо business існує (через select public) — INSERT дозволений"
-- ============================================================

-- 1. Перестворити clients insert policy
do $$ begin
  drop policy if exists "clients_insert_public" on public.clients;
end $$;

create policy "clients_insert_public" on public.clients
  for insert
  with check (
    exists (
      select 1 from public.businesses b where b.id = business_id
    )
  );

-- 2. Те саме для bookings
do $$ begin
  drop policy if exists "bookings_insert_public" on public.bookings;
end $$;

create policy "bookings_insert_public" on public.bookings
  for insert
  with check (
    exists (
      select 1 from public.businesses b where b.id = business_id
    )
  );

-- 3. Перевірка — спробуй вручну
-- Це можна запустити як sanity check у SQL Editor щоб переконатися:
--
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where tablename in ('clients', 'bookings')
-- order by tablename, policyname;
