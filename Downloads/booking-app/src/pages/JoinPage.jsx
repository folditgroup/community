import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { supabase, supabaseReady } from '../supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'
import BrandMark from '../components/BrandMark.jsx'

/**
 * /join/:token — публічна сторінка прийняття invitation.
 *
 * Шлях користувача:
 *   1. Менеджер створив invitation → дав воркеру лінк
 *   2. Воркер відкриває drevito.com/join/<token>
 *   3. Якщо НЕ залогінений → показуємо invitation info + "Sign in to accept"
 *   4. Якщо залогінений з тим самим email → автоприйняти
 *   5. Якщо залогінений з ІНШИМ email → показати "Sign out and try again with <correct email>"
 */
export default function JoinPage() {
  const { token } = useParams()
  const { user, signOut } = useAuth()
  const nav = useNavigate()

  const [invitation, setInvitation] = useState(null)
  const [businessName, setBusinessName] = useState(null)
  const [state, setState] = useState('loading') // loading | invalid | needs_login | wrong_email | ready | accepting | accepted | error
  const [errorMsg, setErrorMsg] = useState('')

  // Завантажити invitation за токеном
  useEffect(() => {
    if (!supabaseReady || !token) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('worker_invitations')
        .select('id, business_id, email, name, role, is_manager, status, expires_at')
        .eq('token', token)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setState('invalid')
        return
      }

      // Дістати ім'я бізнесу окремим запитом (RLS не блокує public select на businesses)
      const { data: biz } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', data.business_id)
        .maybeSingle()

      setInvitation(data)
      setBusinessName(biz?.name || 'this business')

      // Перевірка валідності
      if (data.status !== 'pending') {
        setState('invalid')
        setErrorMsg(`This invitation has already been ${data.status}.`)
        return
      }
      if (new Date(data.expires_at) < new Date()) {
        setState('invalid')
        setErrorMsg('This invitation has expired. Ask your manager to send a new one.')
        return
      }

      // Якщо не залогінений → попросити login
      if (!user) {
        setState('needs_login')
        return
      }

      // Якщо залогінений але іншим email → попросити вийти
      if (user.email.toLowerCase() !== data.email.toLowerCase()) {
        setState('wrong_email')
        return
      }

      // Залогінений тим самим email → готовий приймати
      setState('ready')
    })()
    return () => { cancelled = true }
  }, [token, user])

  const accept = async () => {
    setState('accepting')
    setErrorMsg('')
    const { data, error } = await supabase.rpc('accept_invitation', { invitation_token: token })
    if (error) {
      setState('error')
      setErrorMsg(error.message)
      return
    }
    if (!data?.success) {
      setState('error')
      setErrorMsg(data?.error || 'Could not accept invitation.')
      return
    }
    setState('accepted')
    // Через 2 секунди — на дашборд
    setTimeout(() => nav('/app'), 2000)
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={32} variant="dark" />
          <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {state === 'loading' && (
          <div className="card p-10 text-center text-ink-400">Loading invitation…</div>
        )}

        {state === 'invalid' && (
          <div className="card p-7">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-700">
              <AlertCircle size={22} />
            </div>
            <h1 className="mt-4 font-display text-3xl text-ink-800">Invitation unavailable</h1>
            <p className="mt-2 text-ink-500">{errorMsg || 'This invitation link is invalid or has been used.'}</p>
            <Link to="/" className="btn-ghost mt-5">Go to Drevito home</Link>
          </div>
        )}

        {(state === 'needs_login' || state === 'wrong_email' || state === 'ready' || state === 'accepting' || state === 'error') && invitation && (
          <div className="card p-7">
            <div className="text-xs uppercase tracking-widest text-amber-deep">You're invited</div>
            <h1 className="mt-2 font-display text-3xl text-ink-800">
              Join <span className="text-amber-deep">{businessName}</span>
            </h1>
            <div className="mt-1 text-ink-500">
              {invitation.is_manager ? 'You\'ll join as a manager.' : 'You\'ll join as a crew member.'}
            </div>

            <div className="mt-5 rounded-2xl bg-ink-50 p-4 text-sm">
              <div className="flex justify-between text-ink-500"><span>Email</span><span className="font-medium text-ink-700">{invitation.email}</span></div>
              {invitation.role && (
                <div className="mt-2 flex justify-between text-ink-500"><span>Role</span><span className="font-medium text-ink-700">{invitation.role}</span></div>
              )}
            </div>

            {state === 'needs_login' && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-ink-600">
                  Sign in with the email <span className="font-medium">{invitation.email}</span> to accept this invitation.
                </p>
                <GoogleSignInButton label="Continue with Google" redirectTo={`/join/${token}`} />
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-ink-100" />
                  <span className="mx-3 text-xs uppercase tracking-widest text-ink-400">or</span>
                  <div className="flex-grow border-t border-ink-100" />
                </div>
                <Link to={`/login?return=${encodeURIComponent(`/join/${token}`)}`} className="btn-ghost w-full">
                  Sign in with email
                </Link>
                <p className="text-xs text-center text-ink-400">
                  No account yet? You'll be able to create one with that email.
                </p>
              </div>
            )}

            {state === 'wrong_email' && user && (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  You're signed in as <strong>{user.email}</strong>, but this invitation is for <strong>{invitation.email}</strong>.
                </div>
                <button onClick={async () => { await signOut() }} className="btn-accent w-full">
                  Sign out and try again
                </button>
              </div>
            )}

            {state === 'ready' && (
              <button onClick={accept} className="btn-accent mt-6 w-full">
                Accept invitation <ArrowRight size={16} />
              </button>
            )}

            {state === 'accepting' && (
              <button disabled className="btn-accent mt-6 w-full">Joining…</button>
            )}

            {state === 'error' && (
              <div className="mt-6">
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMsg}</div>
                <button onClick={accept} className="btn-accent mt-3 w-full">Try again</button>
              </div>
            )}
          </div>
        )}

        {state === 'accepted' && (
          <div className="card p-7 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-moss text-white">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="mt-4 font-display text-3xl text-ink-800">You're in!</h1>
            <p className="mt-2 text-ink-500">
              Welcome to {businessName}. Redirecting you to the dashboard…
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
