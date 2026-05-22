-- v06: Flexible pricing
-- Додає price_type до services: 'fixed' | 'from' | 'quote'
--   fixed = одна фіксована ціна
--   from  = "starting at" — показуємо "from $X", фінальна ціна на букінгу
--   quote = ціна за домовленістю, без upfront ціни
--
-- bookings.price вже існує і вже редагований — нічого додавати не треба,
-- тільки UI оновлено щоб дозволити ручне редагування.

alter table public.services
  add column if not exists price_type text not null default 'fixed';

-- Constraint щоб тільки валідні значення
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'services_price_type_check'
  ) then
    alter table public.services
      add constraint services_price_type_check
      check (price_type in ('fixed', 'from', 'quote'));
  end if;
end $$;

-- Існуючі сервіси лишаються 'fixed' (default), нічого не ламається.
