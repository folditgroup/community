import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useBusiness } from '../context/BusinessContext.jsx'
import { supabase } from '../supabase.js'
import { BUSINESS_TYPES } from '../data/businessTypes.js'
import BrandMark from './BrandMark.jsx'

/**
 * Показується юзеру що залогінений але state.business === null.
 *
 * АЛЕ — може бути race condition: BusinessContext refresh ще не побачив
 * щойно створений бізнес. Тому ПРИ КОЖНОМУ MOUNT робимо прямий direct запит
 * до БД щоб переконатись бізнесу справді немає. Якщо є — hard reload на /app.
 *
 * Це фізично розриває loop: навіть якщо refresh падає або повільний,
 * пряма перевірка одразу redirect-ить юзера в дашборд.
 */
export default function CreateBusinessPrompt() {
  const { user, signOut } = useAuth()
  const { createBusinessForUser } = useBusiness()
  const nav = useNavigate()

  const [checkingBusiness, setCheckingBusiness] = useState(true)
  const [invitations, setInvitations] = useState([])
  const [accepting, setAccepting] = useState(null)

  // ANTI-LOOP: пряма перевірка бізнесу через minimal SQL з 5s timeout
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[CreateBusinessPrompt] business check timed out — showing form')
        setCheckingBusiness(false)
      }
    }, 5000)

    ;(async () => {
      console.log('[CreateBusinessPrompt] checking if business exists for user', user.id)

      try {
        // Check 1: чи я owner?
        const { data: ownedBiz, error: ownedErr } = await supabase
          .from('businesses')
          .select('id, name, slug, owner_id')
          .eq('owner_id', user.id)
          .maybeSingle()

        console.log('[CreateBusinessPrompt] owner check:', { ownedBiz, ownedErr })

        if (cancelled) return

        if (ownedBiz) {
          console.log('[CreateBusinessPrompt] FOUND owned business → hard reload')
          clearTimeout(safetyTimeout)
          window.location.href = '/app'
          return
        }

        // Check 2: чи я worker десь?
        const { data: myWorker, error: workerErr } = await supabase
          .from('workers')
          .select('business_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        console.log('[CreateBusinessPrompt] worker check:', { myWorker, workerErr })

        if (cancelled) return

        if (myWorker?.business_id) {
          console.log('[CreateBusinessPrompt] FOUND business via worker → hard reload')
          clearTimeout(safetyTimeout)
          window.location.href = '/app'
          return
        }

        console.log('[CreateBusinessPrompt] no business found, showing form')
        clearTimeout(safetyTimeout)
        setCheckingBusiness(false)

        // Check 3: pending invitations (optional, won't block)
        try {
          const { data: invs } = await supabase.rpc('my_pending_invitations')
          if (!cancelled && Array.isArray(invs)) setInvitations(invs)
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('[CreateBusinessPrompt] check failed:', err)
        if (!cancelled) {
          clearTimeout(safetyTimeout)
          setCheckingBusiness(false)
        }
      }
    })()
    return () => { cancelled = true; clearTimeout(safetyTimeout) }
  }, [user?.id])

  const acceptInvitation = async (inv) => {
    setAccepting(inv.id)
    try {
      const { data, error } = await supabase.rpc('accept_invitation', { invitation_token: inv.token })
      if (error || !data?.success) {
        alert(error?.message || data?.error || 'Could not accept.')
        setAccepting(null)
        return
      }
      window.location.href = '/app'
    } catch (e) {
      alert(e.message || 'Error.')
      setAccepting(null)
    }
  }

  // Поки перевіряємо — показуємо спінер, НЕ форму
  if (checkingBusiness) {
    return (
      <div className="min-h-screen bg-ink-50">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark size={32} variant="dark" />
            <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
          </Link>
        </header>
        <main className="mx-auto flex max-w-md flex-col items-center px-4 pt-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-700" />
          <p className="mt-4 text-sm text-ink-400">Loading your workspace…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={32} variant="dark" />
          <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
        </Link>
        <button onClick={async () => { await signOut(); nav('/login') }} className="text-sm text-ink-500 hover:text-ink-800">
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-md px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="font-display text-4xl text-ink-800">Hi, {user?.email?.split('@')[0]}.</h1>
        <p className="mt-1 text-ink-500">Set up your workspace to get started.</p>

        {invitations.length > 0 && (
          <section className="mt-6 space-y-3">
            <div className="text-xs uppercase tracking-widest text-amber-deep">You have invitations</div>
            {invitations.map((inv) => (
              <div key={inv.id} className="card p-5">
                <div className="font-display text-xl text-ink-800">{inv.business_name}</div>
                <div className="mt-1 text-sm text-ink-500">
                  invites you to join as {inv.is_manager ? <strong>manager</strong> : <strong>{inv.role || 'crew'}</strong>}
                </div>
                <button
                  onClick={() => acceptInvitation(inv)}
                  disabled={accepting === inv.id}
                  className="btn-accent mt-4 w-full"
                >
                  {accepting === inv.id ? 'Joining…' : <>Accept and join <ArrowRight size={16} /></>}
                </button>
              </div>
            ))}
            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-ink-100" />
              <span className="mx-3 text-xs uppercase tracking-widest text-ink-400">or</span>
              <div className="flex-grow border-t border-ink-100" />
            </div>
          </section>
        )}

        <QuickCreate onCreate={createBusinessForUser} />
      </main>
    </div>
  )
}

function QuickCreate({ onCreate }) {
  const [form, setForm] = useState({ businessName: '', businessType: 'landscaping' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      await onCreate({
        name: form.businessName,
        type: form.businessType,
      })
      window.location.href = '/app'
    } catch (err) {
      setError(err.message || 'Could not create workspace.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-7">
      <h2 className="font-display text-2xl text-ink-800">Your business</h2>
      <div>
        <label className="label">Business name</label>
        <input
          className="input"
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label">Industry</label>
        <select
          className="input"
          value={form.businessType}
          onChange={(e) => setForm({ ...form, businessType: e.target.value })}
        >
          {BUSINESS_TYPES.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.label}</option>)}
        </select>
      </div>
      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <button disabled={busy || !form.businessName} className="btn-accent w-full">
        {busy ? 'Creating workspace…' : 'Create workspace'}
      </button>
      <p className="text-center text-xs text-ink-400">
        You can edit details, hours, and services later in Settings.
      </p>
    </form>
  )
}
