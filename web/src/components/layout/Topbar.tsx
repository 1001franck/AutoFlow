import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api, { setAccessToken } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export function Topbar({ title }: { title: string }) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleLang = () => {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    navigate('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-(--color-border) bg-(--color-background)">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Toggle langue FR / EN */}
        <Button variant="ghost" size="sm" onClick={toggleLang} className="text-xs font-semibold w-10">
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </Button>

        {/* Toggle dark / light */}
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Déconnexion */}
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
