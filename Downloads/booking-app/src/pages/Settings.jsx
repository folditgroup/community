import { useEffect, useState } from 'react'
import { useBusiness } from '../context/BusinessContext.jsx'
import { BUSINESS_TYPES } from '../data/businessTypes.js'
import { useAuth } from '../context/AuthContext.jsx'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const DEFAULT_SCHEDULE = {
  mon: { open: 9, close: 17, enabled: true },
  tue: { open: 9, close: 17, enabled: true },
  wed: { open: 9, close: 17, enabled: true },
  thu: { open: 9, close: 17, enabled: true },
  fri: { open: 9, close: 17, enabled: true },
  sat: { open: 9, close: 14, enabled: false },
  sun: { open: 0, close: 0, enabled: false },
}

export default function Settings() {
  const { business, updateBusiness } = useBusiness()
  const { supabaseReady } = useAuth()
  const [form, setForm] = useState(business)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setForm(business) }, [business])
  if (!form) return null

  const schedule = form.schedule || DEFAULT_SCHEDULE
  const slotMinutes = form.slotMinutes ?? form.slot_minutes ?? 30

  const updateDay = (key, patch) => {
    setForm({
      ...form,
      schedule: {
        ...schedule,
        [key]: { ...schedule[key], ...patch },
      },
    })
  }

  const save = async () => {
    setError('')
    try {
      await updateBusiness({
        ...form,
        schedule,
        slotMinutes,
      })
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      setError(e.message || 'Save failed.')
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-4xl text-ink-800">Settings</h1>
        <p className="mt-1 text-ink-500">Your workspace, your booking page, your hours.</p>
      </div>

      {/* Workspace */}
      <section className="card p-6">
        <h2 className="font-display text-2xl text-ink-800">Workspace</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Business name</label><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="label">Industry</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {BUSINESS_TYPES.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.label}</option>)}
            </select>
          </div>
          <div><label className="label">City</label><input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="label">Booking page URL</label>
            <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5">
              <span className="text-ink-400">{location.origin}/book/</span>
              <input
                className="flex-1 outline-none"
                value={form.slug || ''}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Business hours — per day */}
      <section className="card p-6">
        <h2 className="font-display text-2xl text-ink-800">Business hours</h2>
        <p className="mt-1 text-sm text-ink-400">Customers can only book inside these windows.</p>

        <div className="mt-5 divide-y divide-ink-100">
          {DAYS.map(({ key, label }) => {
            const day = schedule[key] || { open: 9, close: 17, enabled: false }
            return (
              <div key={key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
                <label className="inline-flex w-32 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                  />
                  <span className="font-medium text-ink-700">{label}</span>
                </label>
                <div className={`flex flex-1 items-center gap-2 ${day.enabled ? '' : 'opacity-40'}`}>
                  <select
                    className="input !py-1.5 max-w-[110px]"
                    disabled={!day.enabled}
                    value={day.open}
                    onChange={(e) => updateDay(key, { open: +e.target.value })}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                  <span className="text-ink-400">to</span>
                  <select
                    className="input !py-1.5 max-w-[110px]"
                    disabled={!day.enabled}
                    value={day.close}
                    onChange={(e) => updateDay(key, { close: +e.target.value })}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <label className="label">Slot granularity (minutes)</label>
          <select
            className="input max-w-[180px]"
            value={slotMinutes}
            onChange={(e) => setForm({ ...form, slotMinutes: +e.target.value })}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min (1 hour)</option>
          </select>
          <p className="mt-1 text-xs text-ink-400">
            How fine to slice your day for customer booking grid. 30 min works for most trades.
          </p>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl bg-ink-50/95 px-4 py-3 shadow-card backdrop-blur">
        <button onClick={save} className="btn-accent">Save all changes</button>
        {saved && <span className="text-sm text-moss-deep">Saved.</span>}
        {error && <span className="text-sm text-rose-700">{error}</span>}
      </div>

      <section className="card p-6">
        <h2 className="font-display text-2xl text-ink-800">Data</h2>
        <p className="mt-1 text-sm text-ink-500">
          {supabaseReady ? 'Connected to Supabase.' : 'Supabase not configured. Set env vars and redeploy.'}
        </p>
      </section>
    </div>
  )
}

function formatHour(h) {
  if (h === 0) return '12:00 AM'
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}
