import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useBusiness } from '../context/BusinessContext.jsx'

/**
 * Debug page для діагностики проблем з auth/business.
 * Доступна на /debug — показує всі дані які бачить клієнт.
 */
// Build timestamp — used to verify deployed code version
const CODE_VERSION = 'v2026-05-19-20:35-debug-panel-added'

export default function Debug() {
  const { user, loading: authLoading } = useAuth()
  const { business, loading: bizLoading, refresh } = useBusiness()
  const [ownerBusinesses, setOwnerBusinesses] = useState(null)
  const [workerRows, setWorkerRows] = useState(null)
  const [allBusinesses, setAllBusinesses] = useState(null)
  const [authUid, setAuthUid] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        // What auth.uid() returns from server perspective
        const { data: session } = await supabase.auth.getSession()
        setAuthUid(session?.session?.user?.id || 'NO SESSION')

        // Businesses where I'm owner
        const ownerRes = await supabase.from('businesses').select('id,name,owner_id,slug').eq('owner_id', user.id)
        setOwnerBusinesses(ownerRes)

        // Worker rows for me
        const workerRes = await supabase.from('workers').select('id,name,user_id,business_id,is_manager').eq('user_id', user.id)
        setWorkerRows(workerRes)

        // All businesses I can see (RLS-permitted)
        const allRes = await supabase.from('businesses').select('id,name,owner_id,slug').limit(10)
        setAllBusinesses(allRes)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [user])

  const Section = ({ title, data }) => (
    <div style={{ marginBottom: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</div>
      <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', overflow: 'auto', margin: 0 }}>
        {data === null ? '(loading…)' : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', background: '#f0eee5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ color: '#1F3A26' }}>← back to Drevito</Link>
      </div>
      <h1 style={{ fontFamily: 'serif', fontSize: 28 }}>Debug panel</h1>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>Code version: {CODE_VERSION}</div>

      <Section title="Auth state" data={{
        authLoading,
        userId: user?.id || 'NULL',
        email: user?.email || 'NULL',
        authUidFromSession: authUid,
      }} />

      <Section title="BusinessContext state" data={{
        bizLoading,
        businessFound: !!business,
        businessId: business?.id || 'NULL',
        businessName: business?.name || 'NULL',
        ownerId: business?.ownerId || 'NULL',
      }} />

      <Section title="Direct query: businesses WHERE owner_id = my user.id" data={ownerBusinesses} />
      <Section title="Direct query: workers WHERE user_id = my user.id" data={workerRows} />
      <Section title="Direct query: all businesses (RLS-permitted)" data={allBusinesses} />

      {error && <Section title="ERROR" data={error} />}

      <div style={{ marginTop: 20, padding: 12, background: '#1F3A26', color: '#fff', borderRadius: 8 }}>
        <button onClick={() => refresh()} style={{ background: '#7BB661', color: '#1F3A26', border: 'none', padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>
          Force refresh BusinessContext
        </button>
      </div>
    </div>
  )
}
