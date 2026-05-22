import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import { fmtMoney } from '../lib/format.js'
import Modal from '../components/Modal.jsx'

export default function Services() {
  const { services, addService, updateService, removeService } = useBusiness()
  const [editing, setEditing] = useState(null) // { mode: 'add' } | { mode: 'edit', service }

  const close = () => setEditing(null)

  const save = async (form) => {
    try {
      if (editing.mode === 'add') {
        await addService(form)
      } else {
        await updateService(editing.service.id, form)
      }
      close()
    } catch (e) {
      alert(e.message || 'Could not save service.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink-800">Services</h1>
          <p className="mt-1 text-ink-500">The menu your customers can book from.</p>
        </div>
        <button onClick={() => setEditing({ mode: 'add' })} className="btn-accent"><Plus size={16} /> Add service</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => setEditing({ mode: 'edit', service: s })}
                className="min-w-0 flex-1 text-left transition hover:opacity-80"
              >
                <div className="font-display text-2xl text-ink-800">{s.name}</div>
                <div className="mt-1 text-sm text-ink-400">{s.durationMin} min · per {s.unit}</div>
              </button>
              <div className="text-right">
                <div className="font-display text-3xl text-amber-deep">
                  {s.priceType === 'quote'
                    ? <span className="text-xl">By quote</span>
                    : s.priceType === 'from'
                      ? <>from {fmtMoney(s.basePrice)}</>
                      : fmtMoney(s.basePrice)}
                </div>
                <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500">
                  <input type="checkbox" checked={s.active !== false} onChange={(e) => updateService(s.id, { active: e.target.checked })} />
                  Active
                </label>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
              <button
                onClick={() => setEditing({ mode: 'edit', service: s })}
                className="inline-flex items-center gap-1 text-ink-600 hover:text-ink-800"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => { if (confirm(`Remove "${s.name}"?`)) removeService(s.id) }}
                className="inline-flex items-center gap-1 text-rose-700 hover:underline"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="card col-span-full p-10 text-center text-ink-400">
            No services yet. Add your first one above.
          </div>
        )}
      </div>

      {editing && <ServiceModal initial={editing.mode === 'edit' ? editing.service : null} onClose={close} onSave={save} />}
    </div>
  )
}

function ServiceModal({ initial, onClose, onSave }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial || {
    name: '', durationMin: 60, basePrice: 100, unit: 'visit', active: true, bufferMin: 15, priceType: 'fixed',
  })
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    setBusy(true)
    try {
      await onSave(form)
    } finally {
      setBusy(false)
    }
  }

  const priceType = form.priceType ?? 'fixed'

  return (
    <Modal
      title={isEdit ? 'Edit service' : 'Add service'}
      subtitle={isEdit ? 'Update details below. Changes apply immediately.' : 'Customers will see this on your booking page.'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
          <button onClick={handleSave} disabled={!form.name || busy} className="btn-accent">
            {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Add service')}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="e.g. Window cleaning" />
        </div>
        <div>
          <label className="label">Duration (min)</label>
          <input className="input" type="number" min="15" step="15" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: +e.target.value })} />
        </div>
        <div>
          <label className="label">Buffer time (min)</label>
          <input className="input" type="number" min="0" step="5" value={form.bufferMin ?? 15} onChange={(e) => setForm({ ...form, bufferMin: +e.target.value })} />
          <p className="mt-1 text-xs text-ink-400">Travel/cleanup between jobs.</p>
        </div>

        {/* Pricing model */}
        <div className="sm:col-span-2">
          <label className="label">Pricing</label>
          <div className="grid grid-cols-3 gap-2">
            <PriceTypeButton active={priceType === 'fixed'} onClick={() => setForm({ ...form, priceType: 'fixed' })}>
              Fixed
            </PriceTypeButton>
            <PriceTypeButton active={priceType === 'from'} onClick={() => setForm({ ...form, priceType: 'from' })}>
              Starting at
            </PriceTypeButton>
            <PriceTypeButton active={priceType === 'quote'} onClick={() => setForm({ ...form, priceType: 'quote' })}>
              By quote
            </PriceTypeButton>
          </div>
          <p className="mt-1.5 text-xs text-ink-400">
            {priceType === 'fixed' && 'One set price customers see and pay.'}
            {priceType === 'from' && 'Shows "from $X" — final price set per booking.'}
            {priceType === 'quote' && 'No upfront price — you set it after assessing the job.'}
          </p>
        </div>

        {/* Ціна — приховуємо повністю якщо quote */}
        {priceType !== 'quote' && (
          <div>
            <label className="label">{priceType === 'from' ? 'Starting price ($)' : 'Price ($)'}</label>
            <input className="input" type="number" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: +e.target.value })} />
          </div>
        )}
        <div className={priceType === 'quote' ? 'sm:col-span-2' : ''}>
          <label className="label">Unit</label>
          <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="visit">per visit</option>
            <option value="hour">per hour</option>
            <option value="sqft">per sq ft</option>
            <option value="yard">per yard</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active — visible on booking page
          </label>
        </div>
      </div>
    </Modal>
  )
}

function PriceTypeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active ? 'border-amber bg-amber-soft text-ink-800' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
      }`}
    >
      {children}
    </button>
  )
}
