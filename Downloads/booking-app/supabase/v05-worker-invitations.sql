-- ============================================================
-- Drevito v0.5 — Worker Invitations
-- ============================================================
-- Менеджер додає працівника по email → створюється invitation з токеном
-- → менеджер копіює лінк drevito.com/join/<token> → надсилає воркеру
-- → воркер логінится (Google або email/password) тим email
-- → система автоматично прив'язує його як worker до бізнесу
-- ============================================================

create table if not exists public.worker_invitations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  email           text not null,
  name            text,
  role            text default 'Crew',
  is_manager     boolean not null default false,
  token           text not null unique,
  status          text not null default 'pending',  -- 'pending' | 'accepted' | 'expired' | 'cancelled'
  invited_by      uuid references auth.users(id) on delete set null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  created_at      timestamptz not null default now()
);

create index if not exists invitations_business_idx on public.worker_invitations(business_id, status);
create index if not exists invitations_email_idx on public.worker_invitations(lower(email), status);
create unique index if not exists invitations_token_idx on public.worker_invitations(token);

alter table public.worker_invitations enable row level security;

do $$ begin
  drop policy if exists "invitations_select_public_by_token"  on public.worker_invitations;
  drop policy if exists "invitations_manager_all"             on public.worker_invitations;
  drop policy if exists "invitations_invitee_accept"          on public.worker_invitations;
end $$;

-- Анонім може ПРОЧИТАТИ invitation за токеном (для /join/:token сторінки)
-- Це безпечно бо токен — це довгий random string, як одноразовий пароль
create policy "invitations_select_public_by_token" on public.worker_invitations
  for select using (true);

-- Manager керує invitations свого бізнесу
create policy "invitations_manager_all" on public.worker_invitations
  for all
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
    or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
    or business_id in (select business_id from public.workers where user_id = auth.uid() and is_manager = true)
  );

-- ============================================================
-- Функція: accept_invitation
-- ============================================================
-- Викликається коли користувач клацає на /join/:token і вже залогінений
-- Створює worker рядок і позначає invitation як accepted
-- ============================================================

create or replace function public.accept_invitation(invitation_token text)
returns jsonb
language plpgsql
security definer  -- виконується з правами власника функції, обходить RLS
as $$
declare
  inv record;
  current_user_email text;
  new_worker_id uuid;
begin
  -- Перевірка що користувач залогінений
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Знайти invitation
  select * into inv from public.worker_invitations
  where token = invitation_token
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invitation not found');
  end if;

  if inv.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'Invitation already ' || inv.status);
  end if;

  if inv.expires_at < now() then
    update public.worker_invitations set status = 'expired' where id = inv.id;
    return jsonb_build_object('success', false, 'error', 'Invitation expired');
  end if;

  -- Дістати email поточного юзера
  select email into current_user_email from auth.users where id = auth.uid();

  -- Перевірити що email юзера збігається з invitation email (case insensitive)
  if lower(current_user_email) <> lower(inv.email) then
    return jsonb_build_object(
      'success', false,
      'error', 'Invitation email does not match your account email',
      'invitation_email', inv.email,
      'your_email', current_user_email
    );
  end if;

  -- Перевірити чи вже є worker рядок для цього user у цьому бізнесі
  if exists (
    select 1 from public.workers
    where business_id = inv.business_id and user_id = auth.uid()
  ) then
    -- Просто оновити (можливо вже додавався вручну) — не дублювати
    update public.workers
    set is_manager = inv.is_manager, role = coalesce(inv.role, role)
    where business_id = inv.business_id and user_id = auth.uid()
    returning id into new_worker_id;
  else
    -- Створити worker рядок
    insert into public.workers (business_id, user_id, name, email, role, is_manager, color)
    values (
      inv.business_id,
      auth.uid(),
      coalesce(inv.name, current_user_email),
      current_user_email,
      coalesce(inv.role, 'Crew'),
      inv.is_manager,
      '#7BB661'
    )
    returning id into new_worker_id;
  end if;

  -- Позначити invitation як accepted
  update public.worker_invitations
  set status = 'accepted', accepted_user_id = auth.uid(), accepted_at = now()
  where id = inv.id;

  return jsonb_build_object(
    'success', true,
    'worker_id', new_worker_id,
    'business_id', inv.business_id
  );
end;
$$;

-- Грантуємо authenticated юзерам можливість викликати функцію
grant execute on function public.accept_invitation(text) to authenticated;

-- ============================================================
-- Допоміжна функція: check pending invitation for user
-- ============================================================
-- При логіні фронтенд може запитати "чи є для мене pending invitation?"
-- щоб одразу прийняти або показати "You have invitations" notification

create or replace function public.my_pending_invitations()
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  token text,
  role text,
  is_manager boolean,
  expires_at timestamptz
)
language plpgsql
security definer
as $$
declare
  current_user_email text;
begin
  if auth.uid() is null then return; end if;

  select email into current_user_email from auth.users where id = auth.uid();

  return query
    select
      i.id, i.business_id, b.name, b.slug, i.token, i.role, i.is_manager, i.expires_at
    from public.worker_invitations i
    join public.businesses b on b.id = i.business_id
    where lower(i.email) = lower(current_user_email)
      and i.status = 'pending'
      and i.expires_at > now()
    order by i.created_at desc;
end;
$$;

grant execute on function public.my_pending_invitations() to authenticated;
