import { useEffect, useState } from 'react'
import { ExternalLink, Eye, EyeOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import Modal from '../components/Modal.jsx'
import ImageUpload from '../components/ImageUpload.jsx'
import { fmtMoney } from '../lib/format.js'

export default function Profile() {
  const { business, updateBusiness, offers, addOffer, updateOffer, removeOffer } = useBusiness()
  const [form, setForm] = useState(business)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // offer being created/edited

  useEffect(() => { setForm(business) }, [business])
  if (!form) return null

  const save = async () => {
    setError('')
    try {
      await updateBusiness(form)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      setError(e.message || 'Save failed.')
    }
  }

  const togglePublic = async () => {
    try {
      await updateBusiness({ isPublic: !form.isPublic })
      setForm({ ...form, isPublic: !form.isPublic })
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-ink-800">Public profile</h1>
          <p className="mt-1 text-ink-500">How you show up in the Drevito directory.</p>
        </div>
        <a href={`/biz/${business.slug}`} target="_blank" rel="noreferrer" className="btn-ghost">
          <ExternalLink size={14} /> Preview profile
        </a>
      </div>

      <section className="card flex items-center gap-4 p-5">
        <button
          onClick={togglePublic}
          className={`grid h-12 w-12 place-items-center rounded-2xl ${form.isPublic ? 'bg-moss text-white' : 'bg-ink-100 text-ink-500'}`}
        >
          {form.isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <div className="flex-1">
          <div className="font-display text-2xl text-ink-800">
            {form.isPublic ? 'Listed in the directory' : 'Hidden from the directory'}
          </div>
          <div className="text-sm text-ink-400">
            {form.isPublic
              ? 'Customers browsing /discover can find you.'
              : 'You can still take direct bookings — but your profile is hidden from search.'}
          </div>
        </div>
        <button onClick={togglePublic} className="btn-ghost">{form.isPublic ? 'Hide' : 'Show'}</button>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl text-ink-800">Branding</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Tagline</label>
            <input
              className="input"
              value={form.tagline || ''}
              maxLength={120}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="One sentence that sells you."
            />
            <div className="mt-1 text-xs text-ink-400">{(form.tagline || '').length} / 120</div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">About your business</label>
            <textarea
              className="input min-h-[160px]"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What do you do, who do you serve, what makes you different?"
            />
          </div>
          <div>
            <label className="label">Cover image</label>
            <ImageUpload
              value={form.heroImageUrl || ''}
              onChange={(url) => {
                const next = { ...form, heroImageUrl: url }
                setForm(next)
                updateBusiness({ heroImageUrl: url }).catch((e) => setError(e.message))
              }}
              businessId={business.id}
              kind="cover"
              aspect="wide"
            />
          </div>
          <div>
            <label className="label">Logo / avatar</label>
            <ImageUpload
              value={form.avatarUrl || ''}
              onChange={(url) => {
                const next = { ...form, avatarUrl: url }
                setForm(next)
                updateBusiness({ avatarUrl: url }).catch((e) => setError(e.message))
              }}
              businessId={business.id}
              kind="avatar"
              aspect="square"
            />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" value={form.websiteUrl || ''} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="evergreen.com" />
          </div>
          <div>
            <label className="label">Instagram handle</label>
            <input className="input" value={form.instagram || ''} onChange={(e) => setForm({ ...form, instagram: e.target.value.replace(/^@/, '') })} placeholder="evergreenoutdoor" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} className="btn-accent">Save profile</button>
          {saved && <span className="text-sm text-moss-deep">Saved.</span>}
          {error && <span className="text-sm text-rose-700">{error}</span>}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink-800">
              <Sparkles size={18} className="text-amber-deep" /> Offers & promotions
            </h2>
            <p className="mt-1 text-sm text-ink-400">Featured on your profile and the directory cards.</p>
          </div>
          <button onClick={() => setEditing({})} className="btn-accent"><Plus size={14} /> New offer</button>
        </div>

        {offers.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
            No offers yet. Add a seasonal promo or a "first-time customer" deal to stand out in the directory.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {offers.map((o) => (
              <div key={o.id} className="rounded-2xl border border-ink-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-lg text-ink-800">{o.title}</div>
                    {o.description && <div className="mt-0.5 text-sm text-ink-500">{o.description}</div>}
                  </div>
                  {o.price != null && (
                    <div className="text-right">
                      <div className="font-display text-xl text-amber-deep">{fmtMoney(o.price)}</div>
                      {o.originalPrice != null && o.originalPrice > o.price && (
                        <div className="text-[11px] text-ink-400 line-through">{fmtMoney(o.originalPrice)}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-1.5 text-ink-500">
                    <input type="checkbox" checked={o.active} onChange={(e) => updateOffer(o.id, { active: e.target.checked })} />
                    Active
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing(o)} className="text-ink-500 hover:underline">Edit</button>
                    <button onClick={() => { if (confirm('Delete this offer?')) removeOffer(o.id) }} className="inline-flex items-center gap-1 text-rose-700 hover:underline">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <OfferEditor
          offer={editing}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            if (editing.id) await updateOffer(editing.id, payload)
            else await addOffer(payload)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function OfferEditor({ offer, onClose, onSave }) {
  const [form, setForm] = useState({
    title: offer.title || '',
    description: offer.description || '',
    price: offer.price ?? '',
    originalPrice: offer.originalPrice ?? '',
    validUntil: offer.validUntil || '',
    active: offer.active !== false,
  })

  const submit = () => {
    onSave({
      ...form,
      price: form.price === '' ? null : Number(form.price),
      originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
      validUntil: form.validUntil || null,
    })
  }

  return (
    <Modal
      title={offer.id ? 'Edit offer' : 'New offer'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={!form.title} className="btn-accent">Save</button>
        </>
      }
    >
      <div className="space-y-3">
        <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="20% off first mow" autoFocus /></div>
        <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Sale price ($)</label><input type="number" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><label className="label">Original price ($)</label><input type="number" min="0" className="input" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Valid until</label><input type="date" className="input" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-ink-500">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (show on profile + directory)
        </label>
      </div>
    </Modal>
  )
}
