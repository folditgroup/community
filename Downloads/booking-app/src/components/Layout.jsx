import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import CreateBusinessPrompt from './CreateBusinessPrompt.jsx'
import { useBusiness } from '../context/BusinessContext.jsx'

export default function Layout() {
  const { business, loading } = useBusiness()

  if (loading && !business) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-700" />
      </div>
    )
  }
  if (!business) return <CreateBusinessPrompt />

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-10 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
