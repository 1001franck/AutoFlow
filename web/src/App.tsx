import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Workflows } from '@/pages/Workflows';
import { WorkflowEdit } from '@/pages/WorkflowEdit';
import { Credentials } from '@/pages/Credentials';
import { RunHistory } from '@/pages/RunHistory';
import { RunDetail } from '@/pages/RunDetail';
import { Runs } from '@/pages/Runs';
import { Settings } from '@/pages/Settings';
import { Services } from '@/pages/Services';
import { Notifications } from '@/pages/Notifications';
import axios from 'axios';
import api, { setAccessToken } from '@/api/client';

// Intercepte le retour Google Sign-In avant que React s'initialise.
// Le backend redirige vers /?googleOAuth=1&code=<exchangeCode>&email=<email>
// On stocke le code dans sessionStorage pour l'échanger via XHR dans useEffect.
const _gParams = new URLSearchParams(window.location.search);
if (_gParams.get('googleOAuth') === '1') {
  const _code = _gParams.get('code') ?? '';
  const _email = _gParams.get('email') ?? '';
  if (_code) sessionStorage.setItem('googleOAuthCode', _code);
  if (_email) sessionStorage.setItem('googleOAuthEmail', _email);
  window.history.replaceState({}, '', '/');
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = Boolean(localStorage.getItem('isAuth'));
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

// Écran de chargement pendant la restauration de session
function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-(--color-background)">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 rounded-xl bg-(--color-foreground) flex items-center justify-center">
          <svg className="h-4 w-4 text-(--color-background)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="h-1 w-24 rounded-full bg-(--color-muted) overflow-hidden">
          <div className="h-full bg-(--color-foreground) rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Si un code d'échange Google est en attente, on n'est pas encore prêt
  const [ready, setReady] = useState(() => {
    if (sessionStorage.getItem('googleOAuthCode')) return false;
    return !localStorage.getItem('isAuth');
  });

  // Keep-alive : ping /health toutes les 10 min quand l'onglet est visible
  // pour empêcher Render free tier de s'endormir pendant la session
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('isAuth')) {
        api.get('/health').catch(() => {});
      }
    };

    const interval = setInterval(ping, 10 * 60 * 1000);

    // Ping immédiat quand l'utilisateur revient sur l'onglet après une absence
    document.addEventListener('visibilitychange', ping);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);

  useEffect(() => {
    if (ready) return;

    const exchangeCode = sessionStorage.getItem('googleOAuthCode');

    if (exchangeCode) {
      // Échange le code via XHR — le cookie httpOnly est posé dans cette réponse
      sessionStorage.removeItem('googleOAuthCode');
      const email = sessionStorage.getItem('googleOAuthEmail') ?? '';
      sessionStorage.removeItem('googleOAuthEmail');

      const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      axios.post(`${base}/auth/google/signin/exchange`, { code: exchangeCode }, { withCredentials: true })
        .then(({ data }) => {
          setAccessToken(data.accessToken);
          localStorage.setItem('isAuth', '1');
          localStorage.setItem('userEmail', data.email ?? email);
          window.history.replaceState({}, '', '/dashboard');
        })
        .catch(() => {
          localStorage.removeItem('isAuth');
          localStorage.removeItem('userEmail');
        })
        .finally(() => setReady(true));
      return;
    }

    // Timeout de 8s — si Render dort, on ne bloque pas indéfiniment
    const timeout = setTimeout(() => setReady(true), 8000);

    api.post('/auth/refresh')
      .then(({ data }) => setAccessToken(data.accessToken))
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setReady(true);
      });
  }, [ready]);

  if (!ready) return <SplashScreen />;

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/workflows" element={<PrivateRoute><Workflows /></PrivateRoute>} />
          <Route path="/credentials" element={<PrivateRoute><Credentials /></PrivateRoute>} />
          <Route path="/workflows/new" element={<PrivateRoute><WorkflowEdit /></PrivateRoute>} />
          <Route path="/workflows/:id/edit" element={<PrivateRoute><WorkflowEdit /></PrivateRoute>} />
          <Route path="/runs" element={<PrivateRoute><Runs /></PrivateRoute>} />
          <Route path="/workflows/:id/runs" element={<PrivateRoute><RunHistory /></PrivateRoute>} />
          <Route path="/runs/:runId" element={<PrivateRoute><RunDetail /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/services" element={<PrivateRoute><Services /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
