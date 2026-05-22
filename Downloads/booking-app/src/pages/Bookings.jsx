import { useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import { ClipboardList, Search } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import BookingCard from '../components/BookingCard.jsx'
import BookingDetailModal from '../components/BookingDetailModal.jsx'
import EmptyState from '../components/EmptyState.jsx'

const FILTERS = [
  { id: 'upcoming',   label: 'Upcoming' },
  { id: 'today',      label: 'Today' },
  { id: 'past',       label: 'Past' },
  { id: 'all',        label: 'All' },
]

export default function Bookings() {
  const { bookings, clients } = useBusiness()
  const [filter, setFilter] = useState('upcoming')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10)
    let list = bookings
    if (filter === 'upcoming') list = list.filter((b) => parseISO(b.start) >= now)
    if (filter === 'past')     list = list.filter((b) => parseISO(b.end)   <  now)
    if (filter === 'today')    list = list.filter((b) => b.start.startsWith(todayKey))
    if (q.trim()) {
      const ql = q.toLowerCase()
      list = list.filter((b) => {
        const client = clients.find((c) => c.id === b.clientId)
        return (client?.name || '').toLowerCase().includes(ql) || (b.address || '').toLowerCase().includes(ql)
      })
    }
    return list.sort((a, b) => parseISO(a.start) - parseISO(b.start))
  }, [bookings, clients, filter, q])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink-800">Bookings</h1>
        <p className="mt-1 text-ink-500">Every job, ever.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-ink-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === f.id ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search client or address" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing here" description="No bookings match those filters." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => <BookingCard key={b.id} booking={b} onClick={() => setSelected(b)} />)}
        </div>
      )}
      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
