import { useEffect, useMemo, useState } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Search, Sparkles } from 'lucide-react'
import { supabase, supabaseReady } from '../supabase.js'
import { fromBusiness, fromService, fromOffer } from '../lib/mappers.js'
import { BUSINESS_TYPES, getBusinessType } from '../data/businessTypes.js'
import { fmtMoney } from '../lib/format.js'

const ALL = 'all'

export default function Discover() {
  const [businesses, setBusinesses] = useState([])
  const [servicesByBiz, setServicesByBiz] = useState({})
  const [offersByBiz, setOffersByBiz] = useState({})
  const [loadState, setLoadState] = useState('loading')
  const [type, setType] = useState(ALL)
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    if (!supabaseReady) { setLoadState('error'); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data: biz, error: be } = await supabase
          .from('businesses')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
        if (be) throw be
        const ids = (biz || []).map((b) => b.id)
        if (cancelled) return
        if (ids.length === 0) {
          setBusinesses([])
          setLoadState('ready')
          return
        }
        const [svc, off] = await Promise.all([
          supabase.from('services').select('*').in('business_id', ids).eq('active', true),
          supabase.from('offers').select('*').in('business_id', ids).eq('active', true),
        ])
        if (svc.error) throw svc.error
        if (off.error) throw off.error
        const sByBiz = {}
        ;(svc.data || []).forEach((s) => {
          (sByBiz[s.business_id] = sByBiz[s.business_id] || []).push(fromService(s))
        })
        const oByBiz = {}
        ;(off.data || []).forEach((o) => {
          (oByBiz[o.business_id] = oByBiz[o.business_id] || []).push(fromOffer(o))
        })
        if (cancelled) return
        setBusinesses((biz || []).map(fromBusiness))
        setServicesByBiz(sByBiz)
        setOffersByBiz(oByBiz)
        setLoadState('ready')
      } catch (e) {
        if (cancelled) return
        console.error(e)
        setLoadState('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const cities = useMemo(() => {
    const set = new Set(businesses.map((b) => b.city).filter(Boolean))
    return Array.from(set).sort()
  }, [businesses])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return businesses.filter((b) => {
      if (type !== ALL && b.type !== type) return false
      if (city && b.city !== city) return false
      if (ql) {
        const hay = [b.name, b.tagline, b.description, b.city, getBusinessType(b.type).label]
          .join(' ').toLowerCase()
        if (!hay.includes(ql)) return false
      }
      return true
    })
  }, [businesses, type, city, q])

  return (
    <div className="min-h-screen bg-ink-50">
      <Nav />
      <Hero q={q} setQ={setQ} city={city} setCity={setCity} cities={cities} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mt-6 flex flex-wrap gap-2 sm:mt-8">
          <Chip active={type === ALL} onClick={() => setType(ALL)}>All trades</Chip>
          {BUSINESS_TYPES.map((b) => (
            <Chip key={b.id} active={type === b.id} onClick={() => setType(b.id)}>
              <span className="mr-1">{b.emoji}</span> {b.label}
            </Chip>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 sm:mt-8">
          <h2 className="font-display text-2xl text-ink-800 sm:text-3xl">
            {filtered.length} {filtered.length === 1 ? 'pro' : 'pros'}
            {type !== ALL ? ` · ${getBusinessType(type).label}` : ''}
            {city ? ` · ${city}` : ''}
          </h2>
          {(type !== ALL || city || q) && (
            <button onClick={() => { setType(ALL); setCity(''); setQ('') }} className="text-sm text-ink-500 hover:text-ink-800 underline">
              Clear filters
            </button>
          )}
        </div>

        {loadState === 'loading' && <div className="card mt-6 p-10 text-center text-ink-400">Loading providers…</div>}
        {loadState === 'error' && <div className="card mt-6 p-10 text-center text-rose-700">Couldn't load. Make sure Supabase is configured.</div>}
        {loadState === 'ready' && filtered.length === 0 && (
          <div className="card mt-6 p-10 text-center text-ink-400">
            No matches. Try a different trade or clear the filters.
          </div>
        )}

        {loadState === 'ready' && filtered.length > 0 && (
          <div className="mt-6 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => (
              <BizCard
                key={b.id}
                business={b}
                services={servicesByBiz[b.id] || []}
                offers={offersByBiz[b.id] || []}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6 sm:py-6">
      <Link to="/" className="flex shrink-0 items-center gap-2">
        <BrandMark size={32} variant="dark" />
        <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
      </Link>
      <nav className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
        <Link to="/" className="rounded-full bg-ink-800 px-3 py-1.5 text-ink-50 sm:px-4">
          <span className="sm:hidden">Customers</span>
          <span className="hidden sm:inline">For customers</span>
        </Link>
        <Link to="/for-business" className="rounded-full px-3 py-1.5 text-ink-500 hover:text-ink-800 sm:px-4">
          <span className="sm:hidden">Business</span>
          <span className="hidden sm:inline">For businesses</span>
        </Link>
        <Link to="/login" className="rounded-full px-3 py-1.5 text-ink-500 hover:text-ink-800 sm:px-4">Sign in</Link>
      </nav>
    </header>
  )
}

function Hero({ q, setQ, city, setCity, cities }) {
  return (
    <section className="grain relative mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-12">
      <div className="text-center">
        <div className="chip mx-auto"><Sparkles size={12} className="text-amber-deep" /> Vetted local pros</div>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight text-ink-800 sm:text-6xl lg:text-7xl">
          Find someone to <em className="text-amber-deep">get it done</em>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-500 sm:text-lg">
          Landscapers. Window cleaners. Pool techs. Real local businesses with real calendars — book in two clicks.
        </p>
      </div>

      <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-card sm:mt-8 sm:flex-row sm:items-center sm:rounded-full">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you need? Lawn, windows, pool…"
            className="w-full rounded-full bg-transparent py-3 pl-11 pr-4 text-sm outline-none"
          />
        </div>
        <div className="hidden h-6 w-px bg-ink-100 sm:block" />
        <div className="relative">
          <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full appearance-none rounded-full bg-transparent py-3 pl-10 pr-8 text-sm outline-none sm:w-56"
          >
            <option value="">Any city</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </section>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-ink-800 text-ink-50' : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}`}
    >
      {children}
    </button>
  )
}

function BizCard({ business, services, offers }) {
  const type = getBusinessType(business.type)
  const startingPrice = services.length ? Math.min(...services.map((s) => s.basePrice)) : null
  const featuredOffer = offers[0]

  return (
    <Link
      to={`/biz/${business.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="relative h-40 overflow-hidden bg-ink-100">
        {business.heroImageUrl ? (
          <img
            src={business.heroImageUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl">
            {type.emoji}
          </div>
        )}
        {featuredOffer && (
          <span className="absolute left-3 top-3 rounded-full bg-amber px-2.5 py-1 text-[11px] font-semibold text-ink-800 shadow">
            {featuredOffer.title}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-400">
          <span>{type.emoji}</span>
          <span>{type.label}</span>
        </div>
        <div className="mt-1 font-display text-2xl text-ink-800">{business.name}</div>
        {business.tagline && <div className="mt-1 line-clamp-2 text-sm text-ink-500">{business.tagline}</div>}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
          {business.city && <><MapPin size={12} /> {business.city}</>}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="text-sm text-ink-500">
            {startingPrice != null ? <>from <span className="font-semibold text-ink-800">{fmtMoney(startingPrice)}</span></> : 'See profile'}
          </span>
          <ArrowRight size={16} className="text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-ink-800" />
        </div>
      </div>
    </Link>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white py-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-ink-400 sm:flex-row sm:gap-0 sm:px-6">
        <div>© {new Date().getFullYear()} Drevito</div>
        <Link to="/signup" className="hover:text-ink-700">List your business →</Link>
      </div>
    </footer>
  )
}
