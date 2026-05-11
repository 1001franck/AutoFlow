import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut, Globe, ChevronDown } from 'lucide-react';
import api, { setAccessToken } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export function Topbar({ title }: { title: string }) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const email = localStorage.getItem('userEmail') ?? '';
  const displayName = email.split('@')[0] ?? 'Compte';

  const toggleLang = () => {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-8 border-b border-(--color-border) bg-(--color-background)">
      {/* Gauche — titre de la page */}
      <h1 className="text-sm font-semibold tracking-tight text-(--color-foreground)">{title}</h1>

      {/* Droite — actions style Uber */}
      <div className="flex items-center gap-1">

        {/* Toggle langue */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
        >
          <Globe className="h-4 w-4" />
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>

        {/* Toggle thème */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Clair' : 'Sombre'}
        </button>

        {/* Bouton utilisateur pill + dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 h-9 pl-4 pr-3 rounded-full bg-(--color-foreground) text-(--color-background) text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {displayName}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-44 rounded-xl border border-(--color-border) bg-(--color-card) shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-(--color-border)">
                <p className="text-xs text-(--color-muted-foreground) truncate">{email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
