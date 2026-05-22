import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Calendar from './pages/Calendar.jsx'
import Bookings from './pages/Bookings.jsx'
import Workers from './pages/Workers.jsx'
import Clients from './pages/Clients.jsx'
import ClientDetail from './pages/ClientDetail.jsx'
import Services from './pages/Services.jsx'
import Settings from './pages/Settings.jsx'
import Inbox from './pages/Inbox.jsx'
import PublicBooking from './pages/PublicBooking.jsx'
import Discover from './pages/Discover.jsx'
import BusinessProfile from './pages/BusinessProfile.jsx'
import Profile from './pages/Profile.jsx'
import JoinPage from './pages/JoinPage.jsx'
import Debug from './pages/Debug.jsx'
import NotFound from './pages/NotFound.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-700" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Discover />} />
      <Route path="/for-business" element={<Landing />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/book/:slug" element={<PublicBooking />} />
      <Route path="/biz/:slug" element={<BusinessProfile />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/debug" element={<Debug />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/calendar" element={<Calendar />} />
        <Route path="/app/bookings" element={<Bookings />} />
        <Route path="/app/workers" element={<Workers />} />
        <Route path="/app/clients" element={<Clients />} />
        <Route path="/app/clients/:id" element={<ClientDetail />} />
        <Route path="/app/services" element={<Services />} />
        <Route path="/app/inbox" element={<Inbox />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="/app/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
