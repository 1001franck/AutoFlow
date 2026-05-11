import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut, Globe } from 'lucide-react';
import api, { setAccessToken } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export function Topbar({ title }: { title: string }) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const email = localStorage.getItem('userEmail') ?? '';
  const displayName = email.split('@')[0] ?? 'vous';

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

  return (
    <header className="h-14 flex items-center justify-between px-8 bg-(--color-foreground)">
      {/* Gauche — salutation */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-(--color-background)">
          Bienvenue,{' '}
          <span className="font-bold">{displayName}</span>
        </p>
        <span className="text-(--color-background) opacity-20 select-none">·</span>
        <p className="text-xs text-(--color-background) opacity-50">{title}</p>
      </div>

      {/* Droite — actions style Uber */}
      <nav className="flex items-center gap-6">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 text-xs font-medium text-(--color-background) opacity-70 hover:opacity-100 transition-opacity"
        >
          <Globe className="h-3.5 w-3.5" />
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-1.5 text-xs font-medium text-(--color-background) opacity-70 hover:opacity-100 transition-opacity"
        >
          {theme === 'dark'
            ? <><Sun className="h-3.5 w-3.5" /> Clair</>
            : <><Moon className="h-3.5 w-3.5" /> Sombre</>
          }
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-medium text-(--color-background) opacity-70 hover:opacity-100 transition-opacity"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </nav>
    </header>
  );
}
