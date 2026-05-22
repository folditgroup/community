import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Plus, LogOut, ExternalLink, Menu, X,
  LayoutDashboard, Calendar, ClipboardList, Users, UserCircle2, Wrench, Settings as Cog, Megaphone, Sparkles, Inbox as InboxIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useBusiness } from '../context/BusinessContext.jsx'
import { initials } from '../lib/format.js'
import NewBookingModal from './NewBookingModal.jsx'
import BrandMark from './BrandMark.jsx'

const navItems = [
  { to: '/app',          label: 'Today',          icon: LayoutDashboard, end: true },
  { to: '/app/inbox',    label: 'Inbox',          icon: InboxIcon },
  { to: '/app/calendar', label: 'Calendar',       icon: Calendar },
  { to: '/app/bookings', label: 'Bookings',       icon: ClipboardList },
  { to: '/app/clients',  label: 'Clients',        icon: Users },
  { to: '/app/workers',  label: 'Workers',        icon: UserCircle2 },
  { to: '/app/services', label: 'Services',       icon: Wrench },
  { to: '/app/profile',  label: 'Public profile', icon: Megaphone },
  { to: '/app/settings', label: 'Settings',       icon: Cog },
]

export default function TopBar() {
  const { user, signOut } = useAuth()
  const { business } = useBusiness()
  const nav = useNavigate()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/80 px-4 py-3 backdrop-blur sm:gap-3 sm:px-10">
        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden flex-1 md:block">
          <div className="text-xs uppercase tracking-wider text-ink-400">Field Ops</div>
          <div className="font-display text-2xl leading-tight text-ink-800">{business.name}</div>
        </div>

        {/* Mobile business name */}
        <div className="flex-1 truncate font-display text-lg text-ink-800 md:hidden">{business.name}</div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer" className="btn-ghost hidden sm:inline-flex">
            <ExternalLink size={16} /> Booking page
          </a>
          <button className="btn-accent !px-3 !py-2 !text-xs sm:!px-5 sm:!text-sm" onClick={() => setBookingOpen(true)}>
            <Plus size={16} />
            <span className="hidden sm:inline">New booking</span>
            <span className="sm:hidden">New</span>
          </button>
          <div className="ml-1 flex items-center gap-1 sm:ml-2 sm:gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-800 text-xs font-semibold text-amber sm:h-9 sm:w-9 sm:text-sm">
              {initials(user?.displayName || user?.email || 'U')}
            </div>
            <button
              onClick={async () => { await signOut(); nav('/') }}
              className="rounded-full p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {bookingOpen && <NewBookingModal onClose={() => setBookingOpen(false)} />}
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col bg-ink-800 text-ink-100 shadow-pop"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-5">
              <div className="flex items-center gap-3">
                <BrandMark size={36} variant="light" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-50">Drevito</div>
                  <div className="truncate text-xs text-ink-300">{business.name}</div>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-ink-300 hover:bg-ink-700"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-2">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive ? 'bg-ink-700 text-ink-50' : 'text-ink-300 hover:bg-ink-700/60 hover:text-ink-50',
                    ].join(' ')
                  }
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {label}
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
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-50">Your booking page</div>
                  <div className="truncate text-[11px] text-ink-300">/book/{business.slug}</div>
                </div>
              </a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
