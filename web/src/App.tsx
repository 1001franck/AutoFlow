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

// Garde de route — redirige vers /login si non authentifié
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = Boolean(localStorage.getItem('isAuth'));
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}
