import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSession } from '../lib/session';
import Logo from '../components/ui/Logo';

type Mode = 'signin' | 'register';

const INPUT =
  'w-full rounded-md border border-border-input bg-surface px-3 py-2.5 text-13 text-ink placeholder:text-text-muted outline-none transition-colors focus:border-brand-green';
const LABEL = 'mb-1.5 block text-12 font-semibold text-text-label';

/**
 * Unauthenticated entry point. Toggles between signing into an existing
 * workspace and creating a fresh one. All work happens against the local
 * store today; the form contract is what the Supabase-backed version will use.
 */
export default function Login(): JSX.Element {
  const { login, register } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shared fields
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  // register-only fields
  const [workspace, setWorkspace] = useState('');
  const [ownerName, setOwnerName] = useState('');

  function switchMode(next: Mode): void {
    setMode(next);
    setError(null);
    setShowPw(false);
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setError(null);

    // Real accounts authenticate with an email (Supabase Auth). The demo logs in
    // with the "yankeestest" username and stays on the local backend.
    if (mode === 'register' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginName.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      const res =
        mode === 'signin'
          ? await login(loginName.trim(), password)
          : await register({
              login: loginName.trim(),
              password,
              workspaceName: workspace.trim(),
              ownerName: ownerName.trim() || undefined,
            });
      if (!res.ok) setError(res.error ?? 'Something went wrong. Please try again.');
      // on success the gate swaps this screen out automatically
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const isSignin = mode === 'signin';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface-alt px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex items-center">
          <Logo size={26} analytics />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-19 font-bold text-ink">
            {isSignin ? 'Sign in' : 'Create your workspace'}
          </h1>
          <p className="mt-1 text-13 text-text-muted">
            {isSignin
              ? 'Enter your login and password to continue.'
              : 'Set up a new workspace and start connecting chatbots.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-surface-alt p-1">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`rounded-md px-3 py-1.5 text-12.5 font-semibold transition-colors ${
                isSignin ? 'bg-surface text-ink shadow-sm' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-md px-3 py-1.5 text-12.5 font-semibold transition-colors ${
                !isSignin ? 'bg-surface text-ink shadow-sm' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
            {!isSignin && (
              <div>
                <label className={LABEL} htmlFor="workspace">
                  Workspace name
                </label>
                <input
                  id="workspace"
                  className={INPUT}
                  placeholder="e.g. Acme Support"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            )}

            <div>
              <label className={LABEL} htmlFor="login">
                {isSignin ? 'Email or login' : 'Email'}
              </label>
              <input
                id="login"
                className={INPUT}
                type={isSignin ? 'text' : 'email'}
                placeholder={isSignin ? 'yankeestest or you@company.com' : 'you@company.com'}
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                autoComplete={isSignin ? 'username' : 'email'}
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className={`${INPUT} pr-10`}
                  placeholder={isSignin ? 'your password' : 'at least 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-muted hover:text-text-secondary"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isSignin && (
              <div>
                <label className={LABEL} htmlFor="ownerName">
                  Your name <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  id="ownerName"
                  className={INPUT}
                  placeholder="Jane Doe"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-bg px-3 py-2 text-12.5 font-medium text-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-ink px-4 text-13 font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {busy && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isSignin ? 'Sign in' : 'Create workspace'}
            </button>
          </form>
        </div>

        {isSignin && (
          <p className="mt-4 text-center text-12 text-text-muted">
            Demo workspace — login <span className="font-semibold text-text-secondary">yankeestest</span>{' '}
            / password <span className="font-semibold text-text-secondary">32458795</span>
          </p>
        )}
      </div>
    </div>
  );
}
