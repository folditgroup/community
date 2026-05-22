import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark.jsx'
import { ArrowRight, Bot, CalendarDays, Map, Users, ShieldCheck, Sparkles } from 'lucide-react'

const features = [
  { icon: Bot,          title: 'AI dispatcher',     copy: 'Smart scheduling suggests the best crew, slot, and route. Customers can self-book by chat in plain English.' },
  { icon: CalendarDays, title: 'Shared calendar',   copy: 'One source of truth across the team. Reassign with a click, see every job, every crew, every day.' },
  { icon: Users,        title: 'Client memory',     copy: 'Notes, gate codes, pets, preferences — every detail surfaces the second your crew is on the way.' },
  { icon: Map,          title: 'Route optimization',copy: 'We sort each day’s stops into a sensible drive. Less windshield time, more billable hours.' },
  { icon: ShieldCheck,  title: 'Workers first',     copy: 'Crew accounts with the right level of access. Field app for the truck, office app for the desk.' },
  { icon: Sparkles,     title: 'Built for trades',  copy: 'Templates for landscaping, window cleaning, pool service, pest control, detailing and more.' },
]

const verticals = ['Landscaping', 'Window cleaning', 'House cleaning', 'Pool service', 'Pest control', 'Pressure washing', 'Handyman', 'Mobile detailing']

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-50">
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6 sm:py-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <BrandMark size={32} variant="dark" />
          <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-500 md:flex">
          <Link to="/" className="hover:text-ink-800">Find a pro</Link>
          <a href="#features" className="hover:text-ink-800">Features</a>
          <a href="#verticals" className="hover:text-ink-800">Industries</a>
          <a href="#pricing" className="hover:text-ink-800">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden text-sm text-ink-500 hover:text-ink-800 sm:inline">Sign in</Link>
          <Link to="/signup" className="btn-primary !px-3 !text-xs sm:!px-5 sm:!text-sm">Start free <ArrowRight size={14} /></Link>
        </div>
      </header>

      {/* hero */}
      <section className="grain relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="chip mb-4 sm:mb-5">
              <Sparkles size={12} className="text-amber-deep" />
              New · AI booking assistant for your customers
            </div>
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink-800 sm:text-6xl lg:text-7xl">
              Run your <em className="text-amber-deep">field service</em> business like a software company.
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink-500 sm:mt-6 sm:text-lg">
              Drevito is the operating system for landscapers, window cleaners, pool techs and every other crew that runs on calendars. Bookings, workers, clients, routes — and an AI dispatcher that does the boring parts.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <Link to="/signup" className="btn-accent">List your business <ArrowRight size={16} /></Link>
              <Link to="/" className="btn-ghost">Find a pro near you</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-400 sm:mt-10 sm:gap-x-6">
              <span>No credit card</span>
              <span className="h-1 w-1 rounded-full bg-ink-300" />
              <span>14-day full access</span>
              <span className="h-1 w-1 rounded-full bg-ink-300" />
              <span>Cancel anytime</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-amber/20 blur-3xl" />
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                <span className="h-2.5 w-2.5 rounded-full bg-moss" />
                <span className="ml-3 text-xs text-ink-400">drevito.app / today</span>
              </div>
              <div className="space-y-3 p-5">
                <div className="text-xs uppercase tracking-wider text-ink-400">Today, May 18 · 8 jobs · 3 crews</div>
                {[
                  { t: '8:00', name: 'Henderson Family',  job: 'Lawn mowing',   color: '#3F6B4A' },
                  { t: '9:30', name: 'Northstar Cafe',    job: 'Hedge trim',    color: '#F4A93C' },
                  { t: '1:00', name: 'Carla Reyes',       job: 'Lawn mowing',   color: '#B97A1D' },
                ].map((r) => (
                  <div key={r.t} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-xs font-semibold text-ink-700">{r.t}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink-700">{r.name}</div>
                      <div className="text-xs text-ink-400">{r.job}</div>
                    </div>
                    <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-xl bg-ink-800 p-3 text-sm text-ink-50">
                  <Sparkles size={16} className="text-amber" />
                  <span>AI suggests reordering stops — saves 22 min driving today.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="bg-ink-800 py-14 text-ink-50 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-amber">What's inside</div>
            <h2 className="mt-2 font-display text-3xl text-ink-50 sm:text-5xl">Everything your office and crew need. Nothing they don't.</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-ink-700 bg-ink-700/40 p-5 sm:p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber text-ink-800">
                  <f.icon size={18} />
                </div>
                <div className="mt-4 font-display text-xl text-ink-50 sm:text-2xl">{f.title}</div>
                <p className="mt-2 text-sm text-ink-300">{f.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* verticals */}
      <section id="verticals" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid items-center gap-6 sm:gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-deep">Built for</div>
            <h2 className="mt-2 font-display text-3xl text-ink-800 sm:text-5xl">Every service business that runs on appointments.</h2>
            <p className="mt-3 text-ink-500 sm:mt-4">Pick a template when you sign up — services, prices, and average durations preloaded. Tune from there.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {verticals.map((v) => (
              <span key={v} className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 sm:px-4 sm:py-2 sm:text-sm">{v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="bg-amber-soft/60 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="text-xs uppercase tracking-widest text-amber-deep">Pricing</div>
          <h2 className="mt-2 font-display text-3xl text-ink-800 sm:text-5xl">One plan. Built for honest tradespeople.</h2>
          <div className="mt-8 inline-flex flex-col items-center rounded-3xl bg-white px-8 py-8 shadow-card sm:mt-10 sm:px-10 sm:py-10">
            <div className="font-display text-5xl text-ink-800 sm:text-6xl">$49</div>
            <div className="mt-1 text-xs text-ink-400 sm:text-sm">per month · unlimited workers · unlimited bookings</div>
            <Link to="/signup" className="btn-accent mt-6">Start free trial <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink-400 sm:flex-row sm:gap-0 sm:px-6">
          <div>© {new Date().getFullYear()} Drevito</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-ink-700">Privacy</a>
            <a href="#" className="hover:text-ink-700">Terms</a>
            <a href="#" className="hover:text-ink-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
