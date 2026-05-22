-- =====================================================================
-- Fieldbase Storage setup — bucket для cover/avatar зображень
-- =====================================================================
-- ІНСТРУКЦІЯ:
-- 1. Спочатку запусти supabase/schema.sql (основні таблиці + RLS)
-- 2. Потім запусти ЦЕЙ файл — створює bucket profile-images
--    і налаштовує доступ так:
--      • Публічне читання (URL з картинками працює без авторизації)
--      • Запис тільки для власника бізнесу у його папку /{business_id}/
-- =====================================================================

-- Створити публічний bucket
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

-- Видалити старі policies якщо є (idempotent)
do $$ begin
  drop policy if exists "profile_images_public_read"   on storage.objects;
  drop policy if exists "profile_images_owner_insert"  on storage.objects;
  drop policy if exists "profile_images_owner_update"  on storage.objects;
  drop policy if exists "profile_images_owner_delete"  on storage.objects;
end $$;

-- Будь-хто може читати (бакет публічний — для cover/avatar)
create policy "profile_images_public_read"
on storage.objects for select
using (bucket_id = 'profile-images');

-- Залогінений власник може заливати у папку /{свій_business_id}/
create policy "profile_images_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.businesses where owner_id = auth.uid()
  )
);

-- Залогінений власник може оновлювати свої файли
create policy "profile_images_owner_update"
on storage.objects for update
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.businesses where owner_id = auth.uid()
  )
);

-- Залогінений власник може видаляти свої файли
create policy "profile_images_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.businesses where owner_id = auth.uid()
  )
);
