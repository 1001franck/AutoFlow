import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Workflow, KeyRound, Zap, History, Settings, PlugZap, Bell, LogOut, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import api, { setAccessToken } from '@/api/client';

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/workflows',   icon: Workflow,         labelKey: 'nav.workflows' },
  { to: '/runs',        icon: History,          labelKey: 'nav.runs' },
  { to: '/services',    icon: PlugZap,          labelKey: 'nav.services' },
  { to: '/credentials', icon: KeyRound,         labelKey: 'nav.credentials' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

const linkClass = (isActive: boolean) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150',
    isActive
      ? 'bg-(--color-primary) text-(--color-primary-foreground) font-medium'
      : 'text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground)'
  );

export function Sidebar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    select: (d) => ({ unreadCount: d.unreadCount }),
  });

  // Rafraîchit le compteur dès qu'une nouvelle notification arrive en temps réel
  useSocket('notification:new', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col border-r border-(--color-border) bg-(--color-background) z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-(--color-border)">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--color-primary)">
          <Zap className="h-4 w-4 text-(--color-primary-foreground)" strokeWidth={2.5} />
        </div>
        <span className="text-base font-semibold tracking-tight">AutoFlow</span>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </NavLink>
        ))}

        {/* Notifications — avec badge si des alertes non lues */}
        <NavLink to="/notifications" className={({ isActive }) => linkClass(isActive)}>
          <div className="relative shrink-0">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-(--color-destructive) text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {t('nav.notifications')}
        </NavLink>
      </nav>

      {/* Navigation secondaire en bas */}
      <div className="px-3 pb-3 border-t border-(--color-border) pt-3 space-y-0.5">
        {bottomItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </NavLink>
        ))}
        <UserCard />
      </div>
    </aside>
  );
}

function UserCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const email = localStorage.getItem('userEmail') ?? '';
  const initial = email.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative mt-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-(--color-border) hover:bg-(--color-muted) transition-colors"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-(--color-primary-foreground) text-xs font-semibold">
          {initial}
        </div>
        <p className="text-xs text-(--color-muted-foreground) truncate flex-1 text-left">{email}</p>
        <ChevronUp className={`h-3.5 w-3.5 shrink-0 text-(--color-muted-foreground) transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-(--color-border) bg-(--color-card) shadow-lg overflow-hidden z-50">
          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t('nav.settings')}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-(--color-destructive) hover:bg-(--color-muted) transition-colors border-t border-(--color-border)"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
