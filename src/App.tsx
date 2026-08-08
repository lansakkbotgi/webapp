import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import NotificationsPage from './pages/NotificationsPage';
import InstallPrompt from './components/InstallPrompt';
import { api, saveTokens } from './api/client';

// ─── Auto-bypass login (เฉพาะเมื่อเซิร์ฟเวอร์เปิด PWA_ALLOW_BYPASS=true) ───
function AutoBypass({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser } = useAuth();
  const [bypassing, setBypassing] = useState(false);
  const [bypassFailed, setBypassFailed] = useState(false);

  useEffect(() => {
    if (loading || user || bypassFailed) return;
    setBypassing(true);
    api
      .get<{ user: any; accessToken: string; refreshToken: string }>('/auth/bypass-token')
      .then((data) => {
        saveTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
      })
      .catch(() => setBypassFailed(true))
      .finally(() => setBypassing(false));
  }, [loading, user, bypassFailed, setUser]);

  if (loading || bypassing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <div className="spinner" />
      </div>
    );
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AutoBypass>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="voice" element={<VoicePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <InstallPrompt />
        </BrowserRouter>
      </AutoBypass>
    </AuthProvider>
  );
}
