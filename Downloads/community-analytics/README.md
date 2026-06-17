# Community Analytics

Customer-facing analytics dashboard for **Community.com** — brands log in and see,
per chatbot: cost (token + platform), active users, messages per chat, busiest
hours, and the questions people ask most.

It is a **multi-tenant** single-page app: each account owns a workspace, connects
its own chatbots via provider API keys, and sees analytics scoped to that
workspace. A fixed sidebar routes between 5 pages — **Dashboard, Chatbots, Usage,
Reports, Settings**.

The app is **hybrid**: the seeded **NY Yankees demo** (login `yankeestest`) runs
entirely on a local store with verbatim numbers and no backend, while **every
other account is a real Supabase Auth user** whose tenant, chatbots, and
analytics come from the included Vercel serverless API + Supabase Postgres.

## Tech stack

- **Frontend:** React 18 + Vite + TypeScript (strict), Tailwind CSS, Recharts,
  React Router v6, Lucide icons, Hanken Grotesk.
- **Auth + data — demo:** client-side store in `src/lib/store.ts` (localStorage),
  passwords salted + SHA-256 hashed via Web Crypto. Used only by `yankeestest`.
- **Auth + data — real accounts:** Supabase Auth (email + password) via
  `src/lib/supabaseBackend.ts`, with tenant/chatbot/analytics served by Vercel
  serverless functions (Node + TypeScript), Zod validation, Supabase JS
  (service-role), Supabase Postgres + RLS. `src/lib/session.tsx` routes between
  the two backends; pages never branch on which one is active.

## Authentication & multi-tenancy

- **Login / Register.** The app opens on a login screen. Create a workspace
  (login + password) or sign in to an existing one. New workspaces start blank
  — no chatbots, `$0` spend, empty dashboards — until a chatbot is connected.
- **Seeded demo workspace.** A ready **NY Yankees** workspace is pre-seeded so the
  full dashboard is populated out of the box:
  - **login:** `yankeestest`  **password:** `32458795`
- **Connect a chatbot.** The **Chatbots** page is the connect surface. "New
  Chatbot" opens a form: name, provider, model, API key, an optional **per-bot
  monthly budget**, and a **"Capture top questions"** opt-in (off by default).
  Connecting a bot unlocks its metrics across every page; each bot can be edited
  (rotate key, change model/budget/capture) or disconnected. Each bot card also
  has a **Setup** action that shows its `chatbot_id`, the ingest endpoint, and a
  copy-paste snippet — what a customer drops into their bot to start sending
  data. Supported providers: OpenAI, Anthropic, Google, Azure OpenAI, Custom.
- **Customizable settings.** In **Settings** the workspace name, the monthly
  budget amount, and the alert threshold (% of budget) are all editable and
  persist per workspace, alongside the default/fallback model selectors.
- **Per-tenant analytics.** The NY Yankees workspace reproduces the original
  reference dataset exactly. Every other workspace's metrics are derived
  deterministically from its connected chatbots, so dashboards are believable and
  stable across reloads.

### Security model (current, client-side)

- Passwords are **never stored in plain text** — only a random salt + SHA-256
  hash (Web Crypto).
- Raw API keys are **never persisted** — only `keyLast4` + a masked display
  string (`••••••••••EF42`). Real key handling moves server-side when Supabase is
  wired in.
- This local store is a stand-in for a real backend. It is the **one module**
  (`src/lib/store.ts`) to swap for Supabase Auth + Postgres; the rest of the app
  talks only to its exported API and to `src/lib/session.tsx`.

## Project layout

```
api/                      Vercel serverless functions (deferred — not used by the live app yet)
  _lib/                   supabase admin client, auth, zod schemas, period helpers
  webhook/usage.ts        POST — ingest usage events (+ optional question text) from Node-RED
  analytics/*.ts          GET  — overview / tokens / usage / chatbots / questions (tenant-scoped)
src/
  components/
    layout/               Sidebar (tenant + logout), TopBar (per-tenant bot selector)
    charts/               5 Recharts charts
    ui/                    StatCard / TrendBadge / Toggle / Card / EmptyState
    ConnectChatbotModal.tsx   connect/edit a chatbot (provider, model, API key)
  pages/                  Login, Dashboard, Chatbots, Usage, Reports, Settings
  lib/
    store.ts              localStorage auth + tenant store (seeds NY Yankees)
    session.tsx           SessionProvider + analytics hooks (useAnalytics / useAnalyticsFor)
    dataset.ts            Tenant → computed TenantDataset (verbatim Yankees / generated others)
    mockData.ts           buildAnalytics(dataset, chatbot, period) → all page data
    utils.ts              formatters + deterministic seeded series
    appState.tsx, cx.ts
  types/                  shared domain types
supabase/schema.sql       tables + indexes + RLS policies (for the deferred backend)
```

## Getting started

```bash
npm install
npm run dev               # http://localhost:5173
```

Then sign in with the demo workspace (`yankeestest` / `32458795`) or create your
own. No backend or `.env` is required to run the app — auth and data are handled
by the local store.

Scripts: `npm run dev` · `npm run build` · `npm run preview` · `npm run typecheck`.

> **Note on storage.** The local store uses `localStorage`, so data persists per
> browser. Clearing site data resets everything (the NY Yankees demo workspace is
> re-seeded automatically on next load).

## How analytics data gets in (push, not pull)

A bot's stats are **reported by the bot**, not read from the provider — provider
APIs don't expose per-bot conversation analytics. Each time a bot answers, its
backend POSTs one event to the ingest endpoint, which computes cost and stores
it; the dashboard reads the aggregates. Every bot card's **Setup** panel shows
the exact `chatbot_id`, endpoint, and snippet to paste.

The ingest endpoint is configurable via `VITE_INGEST_URL`. Unset, it defaults to
the same-origin `/api/webhook/usage` that ships here (Vercel). **For the AWS
migration, set `VITE_INGEST_URL` to your API Gateway / ALB URL — only that value
changes, the app code does not.** The frontend talks to the data layer through a
single seam (`src/lib/store.ts` + `src/lib/session.tsx`), so swapping the
Vercel+Supabase backend for an AWS one (Cognito/RDS/your API) is isolated to that
seam rather than spread across the UI.

## Backend (Supabase + serverless) — wired for real accounts

Real accounts use the `api/` functions + `supabase/schema.sql` today (the demo
stays local). Configure these env vars (browser vars are build-time):

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | browser | Supabase client (use the **Publishable** key as the anon value) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | serverless | admin client (use the **Secret** key); bypasses RLS |
| `WEBHOOK_SECRET` | serverless | shared secret a bot sends to authenticate the usage webhook |
| `VITE_INGEST_URL` | browser (optional) | absolute ingest URL for the Setup panel; empty → same-origin `/api/webhook/usage` |

New keys: the project's `@supabase/supabase-js` is recent enough to accept the
new `sb_publishable_…` / `sb_secret_…` keys, so legacy `anon`/`service_role`
JWTs are not required. The service-role/Secret key is used **only** under `/api`
and never enters the browser bundle.

### Auth model (hybrid)

- **Demo** logs in with the username `yankeestest`; it never touches Supabase.
- **Real accounts** sign up / sign in with **email + password** (Supabase Auth).
  On first sign-in the client calls `POST /api/auth/bootstrap`, which creates a
  `tenants` row, a default `message_rates` row, and stamps
  `app_metadata.tenant_id` on the user (service role). The client then
  `refreshSession()`s so the new JWT carries the tenant claim that every other
  endpoint reads. RLS scopes all rows to that tenant.

> **Email confirmation.** If Supabase has "Confirm email" enabled, sign-up
> returns no session and the user must confirm before signing in. For a
> frictionless MVP, disable it (Auth → Providers → Email) or handle the confirm
> flow.

### Endpoints

| Method + path | Purpose |
| --- | --- |
| `POST /api/auth/bootstrap` | ensure the signed-in user has a tenant + claim (idempotent) |
| `GET/POST /api/chatbots` | list / create chatbots (returns real `chatbot_id`) |
| `PATCH/DELETE /api/chatbots/[id]` | update / remove a chatbot (tenant-scoped) |
| `PATCH /api/tenant` | update workspace name, budget, alert threshold |
| `GET /api/analytics/dashboard` | aggregate `usage_events` + `top_questions` into a `TenantDataset` |
| `POST /api/webhook/usage` | ingest one reply's usage (Zod-validated, secret-checked) |

`supabase/schema.sql` creates `tenants`, `chatbots`, `usage_events`,
`message_rates`, and `top_questions`, enables RLS, and scopes rows to the
caller's tenant via the JWT's **`app_metadata`**. `POST /api/webhook/usage`
validates with Zod, checks the shared secret, computes cost from model pricing,
and inserts via the service role.

> **What's real vs synthesized for Supabase accounts (MVP).** Headline totals
> (cost, tokens, users, messages), **busiest hours**, and **top questions** are
> real aggregates. The intra-period **daily curve** is still synthesized from the
> totals (seed-based) and **reports** start empty — both are the next refinement.
> A fresh account is empty until its bot POSTs events to the webhook.

### Capturing "what people ask most" (top questions)

The usage webhook accepts an optional `user_message` field. When present **and**
the target bot has `capture_messages = true`, the handler normalizes the text
(collapse whitespace, strip quotes, cap length) and calls the atomic
`bump_top_question()` function, which upserts into `top_questions` and increments
a running count. **Raw transcripts are never stored** — only a normalized
question plus its count, so the "Most Frequent Messages" panel works without
retaining sensitive message bodies. `GET /api/analytics/questions` returns the
tenant's top 6 with each question's share and bar percentage. Capture is opt-in
per bot (off by default) and toggled from the connect/edit modal.

Example webhook body (the `user_message` line is optional):

```json
{
  "chatbot_id": "uuid-from-the-platform",
  "conversation_id": "abc-123",
  "prompt_tokens": 1240,
  "completion_tokens": 320,
  "total_tokens": 1560,
  "model": "gpt-4o",
  "message_count": 1,
  "user_message": "Where do I park?",
  "webhook_secret": "…"
}
```

The migration path: replace the bodies in `src/lib/store.ts` with Supabase Auth +
Postgres calls (sign-up/sign-in, tenant + chatbot CRUD) and point the analytics
hooks at `/api/analytics/*`. The page components and `session.tsx` stay unchanged.

## Notes on the design handoff

The implementation follows the **prototype + screenshots** (the authoritative
visual reference). The NY Yankees workspace is rendered pixel-for-pixel identical
to that reference — same stat cards, chart series, axis labels
(e.g. `May 18 → Jun 16`), top questions, breakdown, reports, and settings — while
the same code path serves generated metrics for every other workspace.
