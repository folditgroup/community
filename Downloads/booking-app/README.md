# Fieldbase

Two products in one:

1. **Operating system** for service businesses — bookings, workers, clients, schedule, AI dispatcher.
2. **Marketplace / directory** for customers — browse local pros by industry & city, view profiles, book directly.

Verticals: landscaping, window cleaning, pool service, pest control, pressure washing, house cleaning, handyman, mobile detailing, and anything else that runs on a calendar.

**Stack:** Vite + React (JS) + Tailwind + **Supabase** (auth + Postgres), deployed to **Vercel**. AI features run on Vercel serverless functions calling Anthropic Claude. Optional.

## Features

### For customers
- **Discover directory** at `/discover` — filter local pros by industry and city, free-text search
- **Public business profiles** at `/biz/<slug>` — about, current offers, services with prices, "Book now"
- **Self-serve booking** at `/book/<slug>` — pick a service + time, or chat with the AI assistant

### For business owners
- **Today / dashboard** — control-center view: stats, today's route, crew workload
- **Shared calendar** — week view, color-coded per worker
- **Bookings** — searchable list, status pills, detail modal, full CRUD
- **Clients CRM** — contacts, tags, notes, job history + revenue
- **Workers** — add/remove crew, skills, colors
- **Services** — per-trade menu with duration + price
- **Public profile editor** — tagline, description, hero image, logo, social links
- **Offers & promotions** — add featured deals that appear on the directory + profile
- **Hide from directory** toggle — opt out anytime, keep direct booking
- **AI assistant** (optional) — chat-based booking + dispatcher / route hints

## Setup — three accounts, ~10 minutes

### 1. Supabase (database + auth)

1. Sign up at https://supabase.com → **New project**. Save the database password somewhere safe.
2. When the project is ready, open the **SQL Editor** → **New query** → paste the entire contents of `supabase/schema.sql` → **Run**. This creates the tables and Row-Level Security policies.
3. **Authentication → Providers → Email**: make sure "Email" is enabled. For faster development, turn off **Confirm email** (or leave it on for production).
4. **Project Settings → API**: copy the **Project URL** and the **anon public key**.

### 2. GitHub

```bash
cd ~/Downloads/booking-app
git add -A
git commit -m "Switch to Supabase"
# Create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/fieldbase.git
git branch -M main
git push -u origin main
```

### 3. Vercel (deploy)

1. Go to https://vercel.com/new → **Import** your repo.
2. Framework preset → **Vite** (auto-detected). Don't change anything else.
3. **Environment Variables** — add:
   - `VITE_SUPABASE_URL` — from step 1.4
   - `VITE_SUPABASE_ANON_KEY` — from step 1.4
   - `ANTHROPIC_API_KEY` — *(optional; required only for the AI booking chat)* get from https://console.anthropic.com
4. **Deploy**.

Every push to `main` from now on auto-deploys.

## Local development

```bash
cd ~/Downloads/booking-app
cp .env.example .env       # then fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                # http://localhost:5173
```

Without Supabase env vars the app loads but tells you it's not configured — set them to use the app.

## First-run flow

1. Open the deployed URL → click **List your business**
2. Create an account (email + password)
3. If "Confirm email" is enabled in Supabase, click the link in your inbox before signing in
4. Sign in → set up your workspace (business name + industry) → done
5. Open **Public profile** in the sidebar to add a tagline, description, photos and any offers — that's what shows up in the `/discover` directory
6. Your booking page is at `/book/<your-slug>` (link in the sidebar)

Customers go to `/discover` directly — no account needed. They filter by industry + city, click a card, view the profile, and book.

## Project structure

```
booking-app/
├─ api/                      # Vercel serverless functions (AI; optional)
│  ├─ ai-chat.js             # public booking chat assistant
│  └─ ai-schedule.js         # dispatcher / route optimizer
├─ supabase/
│  └─ schema.sql             # tables + RLS — paste into Supabase SQL editor
├─ src/
│  ├─ App.jsx                # router
│  ├─ main.jsx
│  ├─ supabase.js            # Supabase client
│  ├─ context/               # AuthContext, BusinessContext
│  ├─ data/businessTypes.js  # industry templates (landscaping, etc.)
│  ├─ lib/                   # mappers (snake_case ↔ camelCase), formatting, routing
│  ├─ components/            # Sidebar, TopBar, Modal, CalendarGrid, etc.
│  └─ pages/                 # Landing, Login, Signup, Discover, BusinessProfile,
│                            #   Dashboard, Calendar, Bookings, Workers, Clients,
│                            #   ClientDetail, Services, Profile (public-facing
│                            #   admin), Settings, PublicBooking, NotFound
├─ ios/                      # SwiftUI crew companion app (separate — see ios/README.md)
├─ vercel.json
├─ vite.config.js
├─ tailwind.config.js
└─ package.json
```

## Industries shipped with templates

Landscaping · Window cleaning · House cleaning · Pool service · Pest control · Pressure washing · Handyman · Mobile auto detailing

(When a new user signs up and picks an industry, default services for that trade are auto-created.)

## Data model (Postgres)

All tables have `business_id`. Row-Level Security (RLS) ensures:

- A logged-in user only sees their own business's rows.
- The `/book/<slug>` page can read `businesses` + `services` and insert into `clients` + `bookings` anonymously — that's why those tables have public-insert/select policies on filtered conditions.

See `supabase/schema.sql` for exact policy definitions.

## How the design is "unique"

Most competitors (Jobber, Housecall Pro, Service Fusion) lean into the typical corporate SaaS aesthetic — blue + white, dense tables, lots of nested menus. Fieldbase goes the other direction:

- **Editorial display serif** (Instrument Serif) for headers, Inter for body — magazine, not spreadsheet
- **Warm amber accent** against deep ink slate, not stock blue
- **Generous spacing**, large numbers, single-purpose pages
- **Control-center "Today" view** as the homepage, not a generic calendar dump
- **Conversational AI booking page** alongside the standard quick-book flow

## Future additions (not built, on purpose)

These each need their own paid accounts:
- Stripe Connect — deposits, invoicing, tips
- Twilio — SMS reminders
- Google Maps Distance Matrix — true route optimization (currently a heuristic)
- Google sign-in — easy to add via Supabase Auth providers

## License

MIT — yours to take and run with.
