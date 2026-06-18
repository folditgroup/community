import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  DollarSign,
  FileText,
  LayoutGrid,
  MessageSquare,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '../../lib/cx';
import { useSession } from '../../lib/session';
import Logo from '../ui/Logo';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/chatbots', label: 'Chatbots', icon: MessageSquare },
  { to: '/usage', label: 'Usage', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

/** Two-letter avatar initials from a workspace name. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function Sidebar(): JSX.Element {
  const { tenant, logout, isAdmin } = useSession();
  const name = tenant?.workspace.name ?? '—';

  const nav: NavItem[] = isAdmin
    ? [...NAV, { to: '/cost', label: 'Cost Explorer', icon: DollarSign }]
    : NAV;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface-alt">
      {/* Logo */}
      <div className="flex items-center px-5 pb-[18px] pt-[22px]">
        <Logo size={24} />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-1.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-[11px] rounded-md px-3 py-[9px] text-13.5 no-underline transition-colors',
                isActive
                  ? 'bg-surface-active font-semibold text-ink'
                  : 'font-medium text-text-secondary hover:bg-surface-hover',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  strokeWidth={1.7}
                  className={isActive ? 'text-ink' : 'text-text-label'}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Tenant footer */}
      <div className="flex items-center gap-[10px] border-t border-border px-4 py-[14px]">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-12 font-semibold text-white">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-13 font-semibold leading-[1.2] text-ink">{name}</div>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer text-11.5 text-text-muted no-underline transition-colors hover:text-ink"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
