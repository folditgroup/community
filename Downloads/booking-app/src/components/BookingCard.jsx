import { Clock, MapPin } from 'lucide-react'
import { fmtTime, fmtMoney } from '../lib/format.js'
import { WorkerStack } from './WorkerAvatar.jsx'
import StatusPill from './StatusPill.jsx'
import { useBusiness } from '../context/BusinessContext.jsx'

export default function BookingCard({ booking, onClick }) {
  const { clients, workers, services, canSeeMoney } = useBusiness()
  const client = clients.find((c) => c.id === booking.clientId)
  const service = services.find((s) => s.id === booking.serviceId)
  const assigned = workers.filter((w) => booking.workerIds?.includes(w.id))

  return (
    <button
      onClick={onClick}
      className="group card w-full text-left transition hover:shadow-pop hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-50 px-2 py-3">
          <Clock size={14} className="text-ink-400" />
          <div className="mt-1 text-sm font-semibold text-ink-700">{fmtTime(booking.start)}</div>
          <div className="text-[11px] text-ink-400">{fmtTime(booking.end)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-ink-800">{client?.name ?? 'Walk-in'}</div>
            <StatusPill status={booking.status} />
          </div>
          <div className="mt-0.5 text-xs text-ink-500">{service?.name ?? 'Service'}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-400">
            <MapPin size={12} />
            <span className="truncate">{booking.address}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <WorkerStack workers={assigned} />
            {canSeeMoney && (
              <span className="text-sm font-semibold text-ink-700">
                {fmtMoney((booking.price || 0) + (booking.tip || 0))}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
