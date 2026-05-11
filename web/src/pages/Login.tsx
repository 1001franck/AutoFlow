import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api, { setAccessToken } from '@/api/client';

// Sphère 3D abstraite — lumière radiale qui donne du volume sans image externe
function AbstractOrb() {
  return (
    <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md opacity-90">
      <defs>
        <radialGradient id="orb-main" cx="38%" cy="32%" r="55%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orb-highlight" cx="35%" cy="28%" r="25%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="blur-soft">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Halo extérieur diffus */}
      <circle cx="250" cy="250" r="220" fill="url(#orb-glow)" filter="url(#blur-soft)" />

      {/* Corps principal de la sphère */}
      <circle cx="250" cy="250" r="190" fill="url(#orb-main)" />

      {/* Bordure fine lumineuse */}
      <circle cx="250" cy="250" r="190" stroke="white" strokeOpacity="0.08" strokeWidth="1" fill="none" />

      {/* Reflet principal — simule la lumière venant du haut gauche */}
      <ellipse cx="185" cy="165" rx="75" ry="55" fill="url(#orb-highlight)" />

      {/* Petit éclat de lumière vif */}
      <ellipse cx="168" cy="148" rx="22" ry="14" fill="white" fillOpacity="0.22" />

      {/* Ombre interne en bas — donne la courbure */}
      <ellipse cx="295" cy="340" rx="110" ry="70" fill="black" fillOpacity="0.18" filter="url(#blur-soft)" />

      {/* Anneau décoratif externe */}
      <circle cx="250" cy="250" r="230" stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" strokeDasharray="4 8" />
    </svg>
  );
}

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
            <Zap className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white text-lg font-semibold tracking-tight">AutoFlow</span>
        </div>

        {/* Orbe centré */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AbstractOrb />
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
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-white dark:bg-[#0a0a0a]">

        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-12 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold">AutoFlow</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-1.5">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h2>
          <p className="text-sm text-[#737373] mb-8">
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

          <p className="mt-6 text-sm text-[#737373] text-center">
            {mode === 'login' ? t('auth.noAccount') : t('auth.alreadyAccount')}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-black dark:text-white font-medium hover:underline underline-offset-4"
            >
              {mode === 'login' ? t('auth.register') : t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
