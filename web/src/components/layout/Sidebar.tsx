import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Workflow, KeyRound, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/workflows', icon: Workflow, labelKey: 'nav.workflows' },
  { to: '/credentials', icon: KeyRound, labelKey: 'nav.credentials' },
];

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col border-r border-(--color-border) bg-(--color-background) z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-(--color-border)">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--color-primary)">
          <Zap className="h-4 w-4 text-(--color-primary-foreground)" strokeWidth={2.5} />
        </div>
        <span className="text-base font-semibold tracking-tight">AutoFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150',
                isActive
                  ? 'bg-(--color-primary) text-(--color-primary-foreground) font-medium'
                  : 'text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground)'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
