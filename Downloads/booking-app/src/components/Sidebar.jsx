import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, ClipboardList, Users, UserCircle2, Wrench, Settings as Cog, Sparkles, Megaphone, Inbox as InboxIcon } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import { supabase, supabaseReady } from '../supabase.js'
import BrandMark from './BrandMark.jsx'

const items = [
  { to: '/app',          label: 'Today',          icon: LayoutDashboard, end: true },
  { to: '/app/inbox',    label: 'Inbox',          icon: InboxIcon, key: 'inbox' },
  { to: '/app/calendar', label: 'Calendar',       icon: Calendar },
  { to: '/app/bookings', label: 'Bookings',       icon: ClipboardList },
  { to: '/app/clients',  label: 'Clients',        icon: Users },
  { to: '/app/workers',  label: 'Workers',        icon: UserCircle2 },
  { to: '/app/services', label: 'Services',       icon: Wrench },
  { to: '/app/profile',  label: 'Public profile', icon: Megaphone },
  { to: '/app/settings', label: 'Settings',       icon: Cog },
]

export default function Sidebar() {
  const { business } = useBusiness()
  const newLeads = useNewLeadCount(business?.id)

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-ink-800 text-ink-100 md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <BrandMark size={36} variant="light" />
        <div>
          <div className="text-sm font-semibold text-ink-50">Drevito</div>
          <div className="truncate text-xs text-ink-300">{business.name}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        {items.map(({ to, label, icon: Icon, end, key }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-ink-700 text-ink-50' : 'text-ink-300 hover:bg-ink-700/60 hover:text-ink-50',
              ].join(' ')
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            {key === 'inbox' && newLeads > 0 && (
              <span className="rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-ink-800">
                {newLeads}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <a
          href={`/book/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-700/40 px-3 py-3 text-xs text-ink-200 transition hover:bg-ink-700"
        >
          <Sparkles size={16} className="text-amber" />
          <div className="flex-1">
            <div className="font-medium text-ink-50">Your booking page</div>
            <div className="truncate text-[11px] text-ink-300">/book/{business.slug}</div>
          </div>
        </a>
      </div>
    </aside>
  )
}

/**
 * Лічильник new leads — оновлюється кожні 60s + при mounted.
 * Тримаємо у Sidebar бо це чудова навігаційна підказка "є що подивитись".
 */
function useNewLeadCount(businessId) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!businessId || !supabaseReady) return
    let cancelled = false
    const fetchCount = async () => {
      const { count: c, error } = await supabase
        .from('lead_requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'new')
      if (!cancelled && !error) setCount(c || 0)
    }
    fetchCount()
    const id = setInterval(fetchCount, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [businessId])
  return count
}
