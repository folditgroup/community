import { useEffect, useState } from 'react'
import { Plus, Mail, Phone, Trash2, Send, Copy, Check, Shield, X } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext.jsx'
import { supabase } from '../supabase.js'
import EmptyState from '../components/EmptyState.jsx'
import Modal from '../components/Modal.jsx'
import WorkerAvatar from '../components/WorkerAvatar.jsx'

const COLORS = ['#7BB661', '#3F6B4A', '#1F3A26', '#4F8A3C', '#B97A1D', '#7C2D12', '#0F766E']

export default function Workers() {
  const { business, workers, bookings, addWorker, removeWorker, updateWorker } = useBusiness()
  const [adding, setAdding] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [createdInvite, setCreatedInvite] = useState(null)
  const [pendingInvitations, setPendingInvitations] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Load pending invitations
  useEffect(() => {
    if (!business?.id) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('worker_invitations')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (!cancelled && !error) setPendingInvitations(data || [])
    })()
    return () => { cancelled = true }
  }, [business?.id, refreshKey])

  const cancelInvitation = async (id) => {
    if (!confirm('Cancel this invitation?')) return
    const { error } = await supabase
      .from('worker_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (!error) setRefreshKey((k) => k + 1)
  }

  const toggleManager = async (worker) => {
    // Owner — не можна demote
    if (worker.userId === business.ownerId) {
      alert("You can't change the owner's role.")
      return
    }
    try {
      await updateWorker(worker.id, { isManager: !worker.isManager })
    } catch (e) {
      alert(e.message || 'Could not update.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-ink-800">Workers</h1>
          <p className="mt-1 text-ink-500">Your crew. Add manually, or invite by email to give them access.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAdding(true)} className="btn-ghost"><Plus size={16} /> Add worker</button>
          <button onClick={() => setInviting(true)} className="btn-accent"><Send size={16} /> Invite by email</button>
        </div>
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <section className="card p-5">
          <h2 className="font-display text-xl text-ink-800">Pending invitations</h2>
          <p className="text-sm text-ink-400">These people have been invited but haven't joined yet.</p>
          <div className="mt-4 space-y-2">
            {pendingInvitations.map((inv) => (
              <PendingInvitationRow
                key={inv.id}
                invitation={inv}
                onCancel={() => cancelInvitation(inv.id)}
                onCopyLink={() => setCreatedInvite(inv)}
              />
            ))}
          </div>
        </section>
      )}

      {workers.length === 0 && pendingInvitations.length === 0 ? (
        <EmptyState
          title="No crew yet"
          description="Add workers manually, or invite them by email so they can log in."
          action={<button onClick={() => setInviting(true)} className="btn-accent"><Send size={16} /> Send first invite</button>}
        />
      ) : workers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => {
            const upcoming = bookings.filter((b) => b.workerIds?.includes(w.id) && new Date(b.start) >= new Date()).length
            const isOwner = w.userId === business.ownerId
            return (
              <div key={w.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <WorkerAvatar worker={w} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate font-display text-xl text-ink-800">{w.name}</div>
                      {isOwner && <span className="rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-bold text-amber-deep">OWNER</span>}
                      {!isOwner && w.isManager && <span className="rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-bold text-amber-deep">MANAGER</span>}
                    </div>
                    <div className="text-xs text-ink-400">{w.role}</div>
                  </div>
                  {!isOwner && (
                    <button
                      onClick={() => { if (confirm(`Remove ${w.name}?`)) removeWorker(w.id) }}
                      className="rounded-full p-1.5 text-ink-300 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {w.email && <div className="flex items-center gap-2 text-ink-500"><Mail size={13} /> {w.email}</div>}
                  {w.phone && <div className="flex items-center gap-2 text-ink-500"><Phone size={13} /> {w.phone}</div>}
                </div>
                {w.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {w.skills.map((s) => <span key={s} className="chip">{s}</span>)}
                  </div>
                )}
                <div className="mt-4 space-y-2 border-t border-ink-100 pt-3">
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span>Upcoming</span>
                    <span className="font-semibold text-ink-700">{upcoming} jobs</span>
                  </div>
                  {!isOwner && (
                    <button
                      onClick={() => toggleManager(w)}
                      className="flex w-full items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-700 hover:bg-ink-100"
                    >
                      <span className="inline-flex items-center gap-1.5"><Shield size={12} /> Manager rights</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${w.isManager ? 'bg-amber text-ink-800' : 'bg-white text-ink-500'}`}>
                        {w.isManager ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <AddWorker
          onClose={() => setAdding(false)}
          onSave={(w) => { addWorker(w); setAdding(false) }}
          existingColors={workers.map((w) => w.color)}
        />
      )}

      {inviting && (
        <InviteWorkerModal
          businessId={business.id}
          onClose={() => setInviting(false)}
          onCreated={(inv) => {
            setInviting(false)
            setCreatedInvite(inv)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      {createdInvite && (
        <InviteLinkModal invitation={createdInvite} onClose={() => setCreatedInvite(null)} />
      )}
    </div>
  )
}

function PendingInvitationRow({ invitation, onCancel, onCopyLink }) {
  const sentAgo = formatTimeAgo(new Date(invitation.created_at))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 p-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink-800">{invitation.name || invitation.email}</div>
        <div className="truncate text-xs text-ink-400">
          {invitation.email} · invited {sentAgo}
          {invitation.is_manager && <span className="ml-2 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-bold text-amber-deep">MANAGER</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onCopyLink} className="rounded-full bg-ink-800 px-3 py-1 text-xs font-medium text-ink-50 hover:bg-ink-700">
          Copy link
        </button>
        <button onClick={onCancel} className="rounded-full p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-700">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function InviteWorkerModal({ businessId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Crew', isManager: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError(''); setBusy(true)
    try {
      const token = generateToken()
      const { data, error } = await supabase
        .from('worker_invitations')
        .insert({
          business_id: businessId,
          email: form.email.trim().toLowerCase(),
          name: form.name.trim() || null,
          role: form.role,
          is_manager: form.isManager,
          token,
        })
        .select()
        .single()
      if (error) throw error
      onCreated(data)
    } catch (e) {
      setError(e.message || 'Could not create invitation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Invite a worker"
      subtitle="They'll get access to bookings and their schedule when they sign in."
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          <button onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
          <button onClick={submit} className="btn-accent" disabled={!form.email || busy}>
            {busy ? 'Creating…' : 'Create invitation'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Their email <span className="text-rose-700">*</span></label>
          <input
            className="input"
            type="email"
            placeholder="worker@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoFocus
          />
          <p className="mt-1 text-xs text-ink-400">They must use this exact email to sign in.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Name (optional)</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" placeholder="Crew" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.isManager}
            onChange={(e) => setForm({ ...form, isManager: e.target.checked })}
          />
          <span>Grant manager rights (can create/edit bookings, invite others)</span>
        </label>
      </div>
    </Modal>
  )
}

function InviteLinkModal({ invitation, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join/${invitation.token}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select-all
    }
  }

  const expires = new Date(invitation.expires_at)
  const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <Modal
      title="Invitation ready"
      subtitle={`Send this link to ${invitation.email}. They'll sign in with that email and join automatically.`}
      onClose={onClose}
      footer={<button onClick={onClose} className="btn-accent">Done</button>}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
          <div className="text-xs uppercase tracking-widest text-ink-400">Invitation link</div>
          <div className="mt-1 break-all font-mono text-xs text-ink-700">{link}</div>
        </div>

        <button onClick={copy} className="btn-accent w-full">
          {copied ? <><Check size={16} /> Copied to clipboard</> : <><Copy size={16} /> Copy link</>}
        </button>

        <div className="rounded-xl bg-amber-soft/40 p-3 text-sm text-ink-700">
          <p className="font-medium">How to send it:</p>
          <p className="mt-1 text-xs text-ink-500">
            Copy the link above and paste it into a text message, WhatsApp, or email to your worker.
            They'll sign in with <strong>{invitation.email}</strong> and be added automatically.
          </p>
        </div>

        <p className="text-center text-xs text-ink-400">
          This link expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}. You can cancel it anytime from the Workers page.
        </p>
      </div>
    </Modal>
  )
}

function AddWorker({ onClose, onSave, existingColors }) {
  const [form, setForm] = useState({
    name: '', role: 'Crew', email: '', phone: '',
    color: COLORS.find((c) => !existingColors.includes(c)) || COLORS[0],
    skills: '',
  })
  return (
    <Modal
      title="Add worker manually"
      subtitle="Use this for workers you manage without their own login. To give them access, use Invite by email."
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => onSave({ ...form, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) })}
            disabled={!form.name}
            className="btn-accent"
          >
            Add worker
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          <div><label className="label">Role</label><input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div>
          <label className="label">Calendar color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                style={{ background: c }}
                className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-white ${form.color === c ? 'ring-ink-800' : 'ring-transparent'}`}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Skills (comma separated)</label>
          <input className="input" placeholder="Mowing, Hedges, Mulch" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        </div>
      </div>
    </Modal>
  )
}

// Generate cryptographically random token for invitation links
function generateToken() {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function formatTimeAgo(date) {
  const ms = Date.now() - date.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
