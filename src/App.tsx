import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './lib/appState';
import { SessionProvider, useSession } from './lib/session';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chatbots from './pages/Chatbots';
import Usage from './pages/Usage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CostExplorer from './pages/CostExplorer';

interface RouteMeta {
  title: string;
  controls: boolean;
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/': { title: 'Analytics', controls: true },
  '/chatbots': { title: 'Chatbots', controls: false },
  '/usage': { title: 'Usage', controls: true },
  '/reports': { title: 'Reports', controls: false },
  '/settings': { title: 'Settings', controls: false },
  '/cost': { title: 'Cost Explorer', controls: false },
};

/** App shell: fixed sidebar + main column (sticky top bar + scrollable content). */
function Shell(): JSX.Element {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] ?? ROUTE_META['/'];

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col bg-surface">
        <TopBar title={meta.title} showControls={meta.controls} />
        <div className="px-7 pb-10 pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/** Brand-coloured splash shown while the local store hydrates. */
function Splash(): JSX.Element {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface">
      <div className="flex items-center gap-3 text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand-green" />
        <span className="text-13">Loading workspace…</span>
      </div>
    </div>
  );
}

/** Decides between the auth screen and the authenticated app. */
function AppGate(): JSX.Element {
  const { ready, account, tenant, isAdmin } = useSession();

  if (!ready) return <Splash />;
  if (!account || !tenant) return <Login />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chatbots" element={<Chatbots />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        {isAdmin && <Route path="/cost" element={<CostExplorer />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <SessionProvider>
        <AppGate />
      </SessionProvider>
    </AppProvider>
  );
}
