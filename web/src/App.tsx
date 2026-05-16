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
import api, { setAccessToken } from '@/api/client';

// Intercepte le retour Google Sign-In avant que React s'initialise.
// Le backend redirige vers /?googleAuth=1&email=...&token=...
// On met à jour localStorage et on nettoie l'URL immédiatement.
const _gParams = new URLSearchParams(window.location.search);
if (_gParams.get('googleAuth') === '1') {
  const _email = _gParams.get('email') ?? '';
  const _token = _gParams.get('token') ?? '';
  localStorage.setItem('isAuth', '1');
  if (_email) localStorage.setItem('userEmail', _email);
  if (_token) setAccessToken(_token);
  // Indique à l'effet de ne pas appeler /auth/refresh — le token est déjà en mémoire
  sessionStorage.setItem('googleJustSignedIn', '1');
  window.history.replaceState({}, '', '/dashboard');
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
  const [ready, setReady] = useState(() => !localStorage.getItem('isAuth'));

  useEffect(() => {
    if (ready) return;

    // Juste après Google Sign-In : le token est déjà en mémoire, pas besoin de refresh
    if (sessionStorage.getItem('googleJustSignedIn')) {
      sessionStorage.removeItem('googleJustSignedIn');
      setTimeout(() => setReady(true), 0);
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
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
