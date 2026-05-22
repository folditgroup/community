-- ============================================================
-- v0.7 — Tips per booking
-- ============================================================
-- Adds a `tip` amount to each booking. Earnings = price + tip.
-- Idempotent — safe to re-run.
-- ============================================================

alter table public.bookings
  add column if not exists tip numeric not null default 0;

-- Note: revenue/tips/profit visibility is enforced in the apps (owner +
-- managers only). Workers can read their own bookings via RLS, but the
-- UI hides all money fields from non-managers.
