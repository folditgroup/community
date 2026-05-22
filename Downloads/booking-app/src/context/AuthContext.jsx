import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from '../supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    if (!supabaseReady) throw new Error('Supabase not configured.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  }

  const signUp = async (email, password, displayName) => {
    if (!supabaseReady) throw new Error('Supabase not configured.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
    return data.user
  }

  const signOut = async () => {
    if (!supabaseReady) return
    await supabase.auth.signOut()
  }

  /**
   * Логін через Google OAuth.
   * Відкриває Google consent screen, після успіху повертає юзера назад на /app
   * (або на URL який передається у redirectTo, наприклад /join/<token>).
   * Якщо це новий юзер — Supabase автоматично створює рядок у auth.users.
   */
  const signInWithGoogle = async (redirectTo) => {
    if (!supabaseReady) throw new Error('Supabase not configured.')
    const target = redirectTo || `${window.location.origin}/app`
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: target,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) throw error
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, supabaseReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
