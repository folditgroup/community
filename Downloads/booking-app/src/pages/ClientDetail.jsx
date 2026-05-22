import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Phone, Save, Trash2 } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import { fmtDateTime, fmtMoney } from '../lib/format.js'
import StatusPill from '../components/StatusPill.jsx'

export default function ClientDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { clients, bookings, services, updateClient, removeClient } = useBusiness()
  const client = clients.find((c) => c.id === id)
  const [draft, setDraft] = useState(client)

  const history = useMemo(
    () => bookings.filter((b) => b.clientId === id).sort((a, b) => new Date(b.start) - new Date(a.start)),
    [bookings, id]
  )

  if (!client) return <div className="text-ink-500">Client not found. <Link to="/app/clients" className="underline">Back to clients</Link>.</div>

  const revenue = history.reduce((a, b) => a + (b.price || 0), 0)

  return (
    <div className="space-y-6">
      <Link to="/app/clients" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft size={14} /> All clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-ink-800">{client.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-500">
            {client.email && <span className="inline-flex items-center gap-1.5"><Mail size={14} /> {client.email}</span>}
            {client.phone && <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {client.phone}</span>}
            {client.address && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {client.address}</span>}
          </div>
        </div>
        <button
          onClick={() => { if (confirm(`Delete ${client.name}? Bookings stay but become unlinked.`)) { removeClient(client.id); nav('/app/clients') } }}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
        >
          <Trash2 size={14} /> Delete client
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Jobs"    value={history.length} />
        <Stat label="Revenue" value={fmtMoney(revenue)} />
        <Stat label="Since"   value={(client.createdAt || '').slice(0, 7)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-5">
          <h2 className="font-display text-2xl text-ink-800">Profile</h2>
          <div className="mt-4 space-y-3">
            <Field label="Phone"   value={draft.phone}   onChange={(v) => setDraft({ ...draft, phone: v })} />
            <Field label="Email"   value={draft.email}   onChange={(v) => setDraft({ ...draft, email: v })} />
            <Field label="Address" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
            <Field label="Tags"
                   value={(draft.tags || []).join(', ')}
                   onChange={(v) => setDraft({ ...draft, tags: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
            <div>
              <label className="label">Notes</label>
              <textarea className="input min-h-[100px]" value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            <button onClick={() => updateClient(client.id, draft)} className="btn-accent w-full"><Save size={14} /> Save changes</button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl text-ink-800">History</h2>
          {history.length === 0 ? (
            <div className="card p-6 text-center text-sm text-ink-400">No jobs on file yet.</div>
          ) : (
            <div className="card divide-y divide-ink-100">
              {history.map((b) => {
                const s = services.find((x) => x.id === b.serviceId)
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-ink-700">{s?.name ?? 'Service'}</div>
                      <div className="text-xs text-ink-400">{fmtDateTime(b.start)}</div>
                    </div>
                    <StatusPill status={b.status} />
                    <div className="w-16 text-right text-sm font-semibold text-ink-700">{fmtMoney(b.price)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-1 font-display text-2xl text-ink-800">{value || '—'}</div>
    </div>
  )
}
