import { useState } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'

export default function Login() {
  const { signIn, supabaseReady } = useAuth()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('return') || '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await signIn(email, password)
      // Hard reload щоб BusinessContext чисто переініціалізувався з новою сесією
      window.location.href = returnTo
    } catch (err) {
      setError(err.message || 'Sign in failed.')
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Drevito workspace.">
      <div className="space-y-4">
        <GoogleSignInButton label="Continue with Google" disabled={busy} />

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-ink-100" />
          <span className="mx-3 text-xs uppercase tracking-widest text-ink-400">or</span>
          <div className="flex-grow border-t border-ink-100" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <button disabled={busy || !email || !password} className="btn-accent w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        {!supabaseReady && (
          <p className="rounded-xl bg-amber-soft px-3 py-2 text-center text-xs text-amber-deep">
            Supabase isn't configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment, then redeploy.
          </p>
        )}
        <p className="pt-2 text-center text-sm text-ink-500">
          No account? <Link to="/signup" className="font-medium text-ink-800 hover:underline">Create one</Link>
        </p>
      </div>
    </AuthShell>
  )
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={32} variant="dark" />
          <span className="font-display text-lg text-ink-800 sm:text-xl">Drevito</span>
        </Link>
        <Link to="/" className="text-sm text-ink-500 hover:text-ink-800">← Home</Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10">
        <h1 className="font-display text-3xl text-ink-800 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
        <div className="mt-6 card p-5 sm:mt-8 sm:p-7">{children}</div>
      </main>
    </div>
  )
}
