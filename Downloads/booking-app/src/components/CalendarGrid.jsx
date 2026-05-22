import { useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'

const HOUR_HEIGHT = 56

export default function CalendarGrid({ onSelectBooking }) {
  const { bookings, workers, clients, services, business } = useBusiness()
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [workerFilter, setWorkerFilter] = useState('all')

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor])
  const startHour = business.hours.start
  const endHour = business.hours.end
  const hours = useMemo(() => Array.from({ length: endHour - startHour }, (_, i) => startHour + i), [startHour, endHour])

  const filteredBookings = workerFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.workerIds?.includes(workerFilter))

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setAnchor(addDays(anchor, -7))} className="rounded-full p-2 hover:bg-ink-100">
            <ChevronLeft size={16} />
          </button>
          <div className="font-display text-2xl text-ink-800">
            {format(anchor, 'MMM d')} – {format(addDays(anchor, 6), 'MMM d, yyyy')}
          </div>
          <button onClick={() => setAnchor(addDays(anchor, 7))} className="rounded-full p-2 hover:bg-ink-100">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="ml-2 chip">
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">Crew:</span>
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value="all">All workers</option>
            {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-ink-100">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-l border-ink-100 px-3 py-2 text-center">
              <div className="text-[11px] uppercase tracking-wider text-ink-400">{format(d, 'EEE')}</div>
              <div className={`mt-0.5 text-base font-semibold ${isSameDay(d, new Date()) ? 'text-amber-deep' : 'text-ink-700'}`}>
                {format(d, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="relative grid min-w-[860px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          {/* time gutter */}
          <div>
            {hours.map((h) => (
              <div key={h} className="h-14 border-b border-ink-50 pr-2 pt-1 text-right text-[11px] text-ink-400">
                {format(new Date().setHours(h, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="relative border-l border-ink-100">
              {hours.map((h) => (
                <div key={h} className="h-14 border-b border-ink-50" />
              ))}
              {filteredBookings
                .filter((b) => isSameDay(parseISO(b.start), d))
                .map((b) => {
                  const start = parseISO(b.start)
                  const end = parseISO(b.end)
                  const topHours = start.getHours() + start.getMinutes() / 60 - startHour
                  const durHours = (end - start) / 1000 / 3600
                  const top = topHours * HOUR_HEIGHT
                  const height = Math.max(durHours * HOUR_HEIGHT - 4, 28)
                  const client = clients.find((c) => c.id === b.clientId)
                  const service = services.find((s) => s.id === b.serviceId)
                  const lead = workers.find((w) => w.id === b.workerIds?.[0])
                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelectBooking?.(b)}
                      style={{ top, height, borderColor: lead?.color || '#3F3F37' }}
                      className="absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] bg-white px-2 py-1.5 text-left shadow-card transition hover:shadow-pop"
                    >
                      <div className="truncate text-[11px] font-medium text-ink-700">{client?.name}</div>
                      <div className="truncate text-[10px] text-ink-400">{service?.name}</div>
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
