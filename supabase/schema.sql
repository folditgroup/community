-- ===========================================================================
-- Community Analytics — database schema (PostgreSQL / Supabase)
-- Multi-tenant. Row-Level Security on every table. Authenticated users may
-- only SELECT rows belonging to their own tenant; the service-role key (used
-- exclusively by the /api serverless functions) bypasses RLS for writes.
-- ===========================================================================

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.tenants (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text unique not null,
  monthly_budget_usd numeric(10, 2) not null default 500,
  alert_threshold_pct integer not null default 80
    check (alert_threshold_pct between 1 and 100),
  alert_email        boolean not null default true,
  weekly_summary     boolean not null default false,
  created_at         timestamptz not null default now()
);

create table if not exists public.chatbots (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  name               text not null,
  provider           text not null default 'OpenAI',
  openai_model       text not null default 'gpt-4o',
  -- Optional per-bot monthly cap (NULL = no dedicated cap, rolls up to tenant budget).
  monthly_budget_usd numeric(10, 2),
  -- Opt-in: when true, the usage webhook may store normalized question text for
  -- this bot (drives the "Most Frequent Messages" panel). Off by default for privacy.
  capture_messages   boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

create table if not exists public.usage_events (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  chatbot_id        uuid not null references public.chatbots (id) on delete cascade,
  conversation_id   text not null,
  prompt_tokens     integer not null,
  completion_tokens integer not null,
  total_tokens      integer not null,
  token_cost_usd    numeric(10, 6) not null,
  platform_cost_usd numeric(10, 6) not null default 0,
  model             text not null,
  hour_of_day       integer check (hour_of_day between 0 and 23),
  created_at        timestamptz not null default now()
);

create table if not exists public.message_rates (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  rate_per_message  numeric(10, 6) not null,
  effective_from    timestamptz not null default now()
);

-- Aggregated "what people ask most" per chatbot. We deliberately store only a
-- normalized question + a running count (NOT raw transcripts) so the panel works
-- without retaining sensitive message bodies. question_key is the lowercased,
-- whitespace-collapsed grouping key; question keeps a human-readable form.
create table if not exists public.top_questions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  chatbot_id   uuid not null references public.chatbots (id) on delete cascade,
  question_key text not null,
  question     text not null,
  ask_count    integer not null default 1,
  last_asked   timestamptz not null default now(),
  unique (tenant_id, chatbot_id, question_key)
);

-- ---------------------------------------------------------------------------
-- Indexes (query patterns: scope by tenant, filter by chatbot + time)
-- ---------------------------------------------------------------------------

create index if not exists idx_chatbots_tenant         on public.chatbots (tenant_id);
create index if not exists idx_usage_events_tenant      on public.usage_events (tenant_id);
create index if not exists idx_usage_events_chatbot     on public.usage_events (chatbot_id);
create index if not exists idx_usage_events_created     on public.usage_events (tenant_id, created_at);
create index if not exists idx_message_rates_tenant     on public.message_rates (tenant_id, effective_from desc);
create index if not exists idx_top_questions_rank       on public.top_questions (tenant_id, chatbot_id, ask_count desc);

-- ---------------------------------------------------------------------------
-- OpenAI Responses API alignment (idempotent — safe to re-run).
-- The bot reports OpenAI identifiers so we can (a) deduplicate retried events
-- and (b) trace a usage row back to its OpenAI response / configured prompt.
--   openai_response_id : OpenAI "id" for the response (unique when present)
--   openai_prompt_id   : OpenAI configured-prompt id (their prompt.id)
--   input_text         : raw query text — stored ONLY when the bot opts in via
--                        chatbots.capture_messages (privacy-safe default off)
-- chatbots.openai_prompt_id maps one of our chatbots to an OpenAI prompt.
-- ---------------------------------------------------------------------------
alter table public.usage_events add column if not exists openai_response_id text;
alter table public.usage_events add column if not exists openai_prompt_id    text;
alter table public.usage_events add column if not exists input_text          text;
alter table public.chatbots     add column if not exists openai_prompt_id    text;

-- Dedup: at most one row per OpenAI response id. Partial so the many events
-- that arrive without an id (NULL) never collide with each other.
create unique index if not exists uq_usage_events_openai_response
  on public.usage_events (openai_response_id)
  where openai_response_id is not null;

create index if not exists idx_usage_events_model
  on public.usage_events (tenant_id, model);

-- ---------------------------------------------------------------------------
-- Tenant claim helper
-- The tenant id is read from the JWT's app_metadata. app_metadata is NOT
-- end-user-writable (unlike user_metadata), so it is the only safe source for
-- a tenant claim. Set it server-side (admin API or a custom access-token hook).
-- ---------------------------------------------------------------------------

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
    ),
    ''
  )::uuid
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.tenants       enable row level security;
alter table public.chatbots      enable row level security;
alter table public.usage_events  enable row level security;
alter table public.message_rates enable row level security;
alter table public.top_questions enable row level security;

-- tenants: a user may read only their own tenant row
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- chatbots: scoped by tenant
drop policy if exists chatbots_select on public.chatbots;
create policy chatbots_select on public.chatbots
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- usage_events: scoped by tenant
drop policy if exists usage_events_select on public.usage_events;
create policy usage_events_select on public.usage_events
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- message_rates: scoped by tenant
drop policy if exists message_rates_select on public.message_rates;
create policy message_rates_select on public.message_rates
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- top_questions: scoped by tenant
drop policy if exists top_questions_select on public.top_questions;
create policy top_questions_select on public.top_questions
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- Note: no INSERT/UPDATE/DELETE policies are defined for the `authenticated`
-- role, so writes are denied for end users. The webhook writes with the
-- service-role key, which bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- Atomic upsert for top_questions. Called by the usage webhook (service role)
-- when a chatbot has capture_messages = true and an event carries question text.
-- INSERTs a new question or increments the running count for an existing one.
-- ---------------------------------------------------------------------------

create or replace function public.bump_top_question(
  p_tenant_id  uuid,
  p_chatbot_id uuid,
  p_key        text,
  p_question   text
)
returns void
language sql
as $$
  insert into public.top_questions (tenant_id, chatbot_id, question_key, question, ask_count, last_asked)
  values (p_tenant_id, p_chatbot_id, p_key, p_question, 1, now())
  on conflict (tenant_id, chatbot_id, question_key)
  do update set
    ask_count  = public.top_questions.ask_count + 1,
    question   = excluded.question,
    last_asked = now();
$$;
-- ---------------------------------------------------------------------------
-- Cost summary for a client (tenant) over a time window, broken down by model.
-- Powers GET /api/analytics/cost. Aggregates in SQL so totals stay correct
-- regardless of row volume (no client-side row cap). Ports to RDS unchanged.
-- ---------------------------------------------------------------------------

create or replace function public.analytics_cost_summary(
  p_tenant_id uuid,
  p_from      timestamptz,
  p_to        timestamptz
)
returns table (
  model             text,
  event_count       bigint,
  total_tokens      bigint,
  token_cost_usd    numeric,
  platform_cost_usd numeric
)
language sql
stable
as $$
  select
    model,
    count(*)::bigint                          as event_count,
    coalesce(sum(total_tokens), 0)::bigint    as total_tokens,
    coalesce(sum(token_cost_usd), 0)          as token_cost_usd,
    coalesce(sum(platform_cost_usd), 0)       as platform_cost_usd
  from public.usage_events
  where tenant_id = p_tenant_id
    and created_at >= p_from
    and created_at <  p_to
  group by model
  order by sum(token_cost_usd) desc;
$$;
