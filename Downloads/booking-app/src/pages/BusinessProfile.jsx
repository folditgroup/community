import { useEffect, useState } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, ExternalLink, Globe, Instagram, Mail, MapPin, Phone, Sparkles, Tag } from 'lucide-react'
import { supabase, supabaseReady } from '../supabase.js'
import { fromBusiness, fromService, fromOffer } from '../lib/mappers.js'
import { getBusinessType } from '../data/businessTypes.js'
import { fmtMoney } from '../lib/format.js'

export default function BusinessProfile() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [offers, setOffers] = useState([])
  const [loadState, setLoadState] = useState('loading')

  useEffect(() => {
    if (!supabaseReady) { setLoadState('error'); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data: biz, error: be } = await supabase
          .from('businesses').select('*').eq('slug', slug).maybeSingle()
        if (be) throw be
        if (!biz) { if (!cancelled) setLoadState('missing'); return }
        const [svc, off] = await Promise.all([
          supabase.from('services').select('*').eq('business_id', biz.id).eq('active', true).order('base_price'),
          supabase.from('offers').select('*').eq('business_id', biz.id).eq('active', true).order('created_at', { ascending: false }),
        ])
        if (svc.error) throw svc.error
        if (off.error) throw off.error
        if (cancelled) return
        setBusiness(fromBusiness(biz))
        setServices((svc.data || []).map(fromService))
        setOffers((off.data || []).map(fromOffer))
        setLoadState('ready')
      } catch (e) {
        console.error(e)
        if (!cancelled) setLoadState('error')
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  if (loadState === 'loading') return <Shell><div className="py-20 text-center text-ink-400">Loading…</div></Shell>
  if (loadState === 'missing') return <Shell><div className="py-20 text-center text-ink-500">No business at <code>/{slug}</code>.</div></Shell>
  if (loadState === 'error')   return <Shell><div className="py-20 text-center text-rose-700">Something went wrong.</div></Shell>

  const type = getBusinessType(business.type)

  return (
    <Shell>
      <div className="relative h-48 overflow-hidden rounded-2xl bg-ink-100 sm:h-80 sm:rounded-3xl">
        {business.heroImageUrl ? (
          <img src={business.heroImageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div className="grid h-full w-full place-items-center text-6xl sm:text-7xl">{type.emoji}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
        <Link to="/discover" className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-ink-700 backdrop-blur hover:bg-white">
          <ArrowLeft size={12} /> Discover
        </Link>
      </div>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-3 sm:gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-ink-100 text-2xl shadow sm:h-20 sm:w-20 sm:text-3xl">
            {business.avatarUrl ? <img src={business.avatarUrl} alt="" className="h-full w-full object-cover" /> : type.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-amber-deep">{type.emoji} {type.label}</div>
            <h1 className="font-display text-2xl text-ink-800 sm:text-4xl lg:text-5xl">{business.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 sm:text-sm sm:gap-x-4">
              {business.city && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {business.city}</span>}
              {business.phone && <span className="inline-flex items-center gap-1"><Phone size={13} /> {business.phone}</span>}
              {business.email && <span className="inline-flex items-center gap-1 break-all"><Mail size={13} /> {business.email}</span>}
            </div>
          </div>
        </div>
        {business.acceptingBookings && (
          <Link to={`/book/${business.slug}`} className="btn-accent self-start sm:self-auto">
            <Calendar size={16} /> Book now
          </Link>
        )}
      </header>

      {business.tagline && (
        <div className="mt-5 font-display text-xl italic text-ink-600 sm:mt-6 sm:text-2xl">"{business.tagline}"</div>
      )}

      <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-10">
          {business.description && (
            <div>
              <h2 className="font-display text-2xl text-ink-800">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-600 leading-relaxed">{business.description}</p>
            </div>
          )}

          {offers.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-2xl text-ink-800">
                <Sparkles size={18} className="text-amber-deep" /> Current offers
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {offers.map((o) => (
                  <div key={o.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-display text-xl text-ink-800">{o.title}</div>
                      {o.price != null && (
                        <div className="text-right">
                          <div className="font-display text-2xl text-amber-deep">{fmtMoney(o.price)}</div>
                          {o.originalPrice != null && o.originalPrice > o.price && (
                            <div className="text-xs text-ink-400 line-through">{fmtMoney(o.originalPrice)}</div>
                          )}
                        </div>
                      )}
                    </div>
                    {o.description && <p className="mt-2 text-sm text-ink-500">{o.description}</p>}
                    {o.validUntil && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
                        <Tag size={12} /> Valid through {o.validUntil}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-display text-2xl text-ink-800">Services</h2>
            {services.length === 0 ? (
              <div className="card mt-3 p-6 text-sm text-ink-400">No services listed yet.</div>
            ) : (
              <div className="mt-3 card divide-y divide-ink-100">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <div className="font-medium text-ink-800">{s.name}</div>
                      <div className="text-xs text-ink-400">{s.durationMin} min · per {s.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl text-amber-deep">{fmtMoney(s.basePrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {business.acceptingBookings && (
              <Link to={`/book/${business.slug}`} className="btn-primary mt-5">
                Book a service <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-ink-400">Get in touch</div>
            <div className="mt-3 space-y-2 text-sm">
              {business.phone   && <Row icon={Phone}>{business.phone}</Row>}
              {business.email   && <Row icon={Mail}>{business.email}</Row>}
              {business.websiteUrl && <Row icon={Globe}><a className="hover:underline" href={withProtocol(business.websiteUrl)} target="_blank" rel="noreferrer">{stripProtocol(business.websiteUrl)} <ExternalLink size={10} className="inline" /></a></Row>}
              {business.instagram && <Row icon={Instagram}><a className="hover:underline" href={`https://instagram.com/${business.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer">@{business.instagram.replace(/^@/, '')}</a></Row>}
            </div>
          </div>

          {!business.acceptingBookings && (
            <div className="rounded-2xl bg-ink-100 p-4 text-sm text-ink-500">
              This business is not currently accepting online bookings.
            </div>
          )}
        </aside>
      </div>
    </Shell>
  )
}

function Row({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-ink-600">
      <Icon size={14} className="text-ink-400" />
      <span>{children}</span>
    </div>
  )
}

function withProtocol(url) {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
function stripProtocol(url) {
  return (url || '').replace(/^https?:\/\//i, '')
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={32} variant="dark" />
          <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
        </Link>
        <Link to="/discover" className="text-sm text-ink-500 hover:text-ink-800">← All providers</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">{children}</main>
    </div>
  )
}
