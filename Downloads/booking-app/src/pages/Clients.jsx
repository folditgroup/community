import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Modal from '../components/Modal.jsx'
import { initials } from '../lib/format.js'

export default function Clients() {
  const { clients, bookings, addClient } = useBusiness()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const list = useMemo(() => {
    const ql = q.toLowerCase()
    return clients
      .filter((c) => !ql || c.name.toLowerCase().includes(ql) || (c.address || '').toLowerCase().includes(ql))
      .map((c) => ({
        ...c,
        jobs: bookings.filter((b) => b.clientId === c.id).length,
        revenue: bookings.filter((b) => b.clientId === c.id).reduce((a, b) => a + (b.price || 0), 0),
      }))
  }, [clients, bookings, q])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink-800">Clients</h1>
          <p className="mt-1 text-ink-500">Your customer database with full history.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-accent"><Plus size={16} /> Add client</button>
      </div>

      <div className="relative w-full max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Search name or address" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No clients yet" description="Add your first client to start tracking history." />
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {list.map((c) => (
            <Link
              key={c.id}
              to={`/app/clients/${c.id}`}
              className="flex items-center gap-4 px-5 py-4 transition hover:bg-ink-50"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink-800">{c.name}</div>
                <div className="truncate text-xs text-ink-400">{c.address}</div>
              </div>
              <div className="hidden sm:flex flex-wrap gap-1">
                {c.tags?.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
              <div className="text-right text-xs text-ink-500">
                <div className="font-semibold text-ink-700">{c.jobs} jobs</div>
                <div>${c.revenue} total</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {adding && <AddClient onClose={() => setAdding(false)} onSave={(c) => { addClient(c); setAdding(false) }} />}
    </div>
  )
}

function AddClient({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', tags: '', notes: '' })
  return (
    <Modal
      title="Add client"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => onSave({ ...form, tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean) })}
            disabled={!form.name}
            className="btn-accent"
          >
            Save client
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Tags (comma separated)</label><input className="input" placeholder="weekly, gate-code" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </div>
    </Modal>
  )
}
