import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    const err = searchParams.get('error');
    if (!err) return '';
    const messages: Record<string, string> = {
      google_cancelled: t('auth.googleCancelled'),
      google_expired:   t('auth.googleExpired'),
      google_failed:    t('common.error'),
    };
    return messages[err] ?? t('common.error');
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      setAccessToken(data.accessToken);
      localStorage.setItem('isAuth', '1');
      localStorage.setItem('userEmail', email);
      navigate('/dashboard');
    } catch {
      setError(mode === 'login' ? t('auth.invalidCredentials') : t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data } = await api.get('/auth/google/signin/init');
      window.location.href = data.url;
    } catch {
      setError(t('common.error'));
      setGoogleLoading(false);
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

          {/* Bouton Google Sign-In */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-(--color-border) bg-(--color-background) text-sm font-medium text-(--color-foreground) hover:bg-(--color-muted) transition-colors disabled:opacity-50 mb-6"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? t('common.loading') : t('auth.continueWithGoogle')}
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-(--color-border)" />
            <span className="text-xs text-(--color-muted-foreground)">{t('auth.orContinueWith')}</span>
            <div className="flex-1 h-px bg-(--color-border)" />
          </div>

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
