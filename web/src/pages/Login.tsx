import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Sun, Moon } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api, { setAccessToken } from '@/api/client';
import animationUrl from '@/assets/animation.lottie';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      setAccessToken(data.accessToken);
      localStorage.setItem('isAuth', '1');
      navigate('/dashboard');
    } catch {
      setError(mode === 'login' ? 'Identifiants incorrects' : 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">

      {/* ── Côté gauche — identité visuelle ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between bg-black p-12 relative overflow-hidden">

        {/* Logo */}
        <div className="flex items-center gap-2.5 z-10 relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
            <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white text-lg font-semibold tracking-tight">AutoFlow</span>
        </div>

        {/* Animation Lottie centrée */}
        <div className="absolute inset-0 flex items-center justify-center px-12">
          <DotLottieReact
            src={animationUrl}
            loop
            autoplay
            className="w-full max-w-lg"
          />
        </div>

        {/* Tagline en bas */}
        <div className="z-10 relative">
          <p className="text-white/90 text-3xl font-light leading-snug tracking-tight max-w-xs">
            Automatisez<br />l'extraordinaire.
          </p>
          <p className="text-white/40 text-sm mt-3">
            Connectez vos services. Libérez votre temps.
          </p>
        </div>
      </div>

      {/* ── Côté droit — formulaire ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-(--color-background) relative">

        {/* Bouton thème */}
        <div className="absolute top-4 right-4">
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-12 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--color-primary)">
            <Zap className="h-4 w-4 text-(--color-primary-foreground)" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold">AutoFlow</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-(--color-foreground) mb-1.5">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h2>
          <p className="text-sm text-(--color-muted-foreground) mb-8">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              type="email"
              label={t('auth.email')}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="password"
              type="password"
              label={t('auth.password')}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              error={error}
            />

            <Button type="submit" disabled={loading} className="mt-2 w-full h-11">
              {loading ? t('common.loading') : mode === 'login' ? t('auth.login') : t('auth.register')}
            </Button>
          </form>

          <p className="mt-6 text-sm text-(--color-muted-foreground) text-center">
            {mode === 'login' ? t('auth.noAccount') : t('auth.alreadyAccount')}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-(--color-foreground) font-medium hover:underline underline-offset-4"
            >
              {mode === 'login' ? t('auth.register') : t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
