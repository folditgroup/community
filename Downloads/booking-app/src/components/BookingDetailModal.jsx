import { useState } from 'react'
import { MapPin, Phone, Trash2, User, Sparkles } from 'lucide-react'
import Modal from './Modal.jsx'
import StatusPill from './StatusPill.jsx'
import { useBusiness } from '../context/BusinessContext.jsx'
import { fmtDateTime } from '../lib/format.js'

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']

export default function BookingDetailModal({ booking, onClose }) {
  const { clients, services, workers, updateBooking, removeBooking, canSeeMoney } = useBusiness()
  const client = clients.find((c) => c.id === booking.clientId)
  const service = services.find((s) => s.id === booking.serviceId)

  // Усі редаговані поля — локальний state, зберігаємо одним Save
  const [notes, setNotes] = useState(booking.notes || '')
  const [price, setPrice] = useState(String(booking.price ?? 0))
  const [tip, setTip] = useState(String(booking.tip ?? 0))
  const [address, setAddress] = useState(booking.address || '')
  const [workerIds, setWorkerIds] = useState(booking.workerIds || [])
  const [status, setStatus] = useState(booking.status || 'scheduled')
  const [saving, setSaving] = useState(false)

  const toggleWorker = (id) => {
    setWorkerIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  const save = async () => {
    setSaving(true)
    await updateBooking(booking.id, {
      notes,
      // Only managers can change money; preserve existing values otherwise.
      ...(canSeeMoney ? { price: price === '' ? 0 : Number(price), tip: tip === '' ? 0 : Number(tip) } : {}),
      address,
      workerIds,
      status,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title={client?.name || 'Booking'}
      subtitle={service?.name}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={() => { if (confirm('Delete this booking?')) { removeBooking(booking.id); onClose() } }}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={14} /> Delete
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={save} className="btn-accent" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={User}  label="Client" value={client?.name} />
          <Info icon={Phone} label="Phone"  value={client?.phone} />
          <Info              label="When"   value={`${fmtDateTime(booking.start)} → ${fmtDateTime(booking.end).split('·')[1]?.trim()}`} />
        </div>

        {/* Ціна + чайові — лише для owner/managers */}
        {canSeeMoney && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Price</label>
                {service && Number(price) !== service.basePrice && (
                  <button
                    onClick={() => setPrice(String(service.basePrice))}
                    className="text-xs font-medium text-amber-deep hover:underline"
                  >
                    Reset to ${service.basePrice}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                <input
                  type="number" min="0" step="0.01"
                  className="input pl-8"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-ink-400">Custom quotes, discounts, extra work.</p>
            </div>
            <div>
              <label className="label">Tip</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                <input
                  type="number" min="0" step="0.01"
                  className="input pl-8"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-ink-400">Logged toward earnings.</p>
            </div>
          </div>
        )}

        {/* Редагована адреса */}
        <div>
          <label className="label">Address</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Job site address"
            />
          </div>
        </div>

        {/* Редагований crew */}
        <div>
          <label className="label">Assigned crew</label>
          <div className="flex flex-wrap gap-2">
            {workers.map((w) => {
              const on = workerIds.includes(w.id)
              return (
                <button
                  key={w.id}
                  onClick={() => toggleWorker(w.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-ink-800 bg-ink-800 text-ink-50' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}`}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: w.color }} />
                  {w.name}
                </button>
              )
            })}
            {workers.length === 0 && <span className="text-sm text-ink-400">No crew yet.</span>}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${status === s ? 'bg-ink-800 text-ink-50' : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}`}
              >
                <StatusPill status={s} />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

function Info({ icon: Icon, label, value, children }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm text-ink-700">
        {Icon && <Icon size={14} className="text-ink-400" />}
        {children || <span>{value || '—'}</span>}
      </div>
    </div>
  )
}
