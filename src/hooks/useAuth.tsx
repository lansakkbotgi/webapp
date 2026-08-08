import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type MobileUser, getMe } from '../api/auth';
import { clearTokens, getAccessToken } from '../api/client';

interface AuthContextType {
  user: MobileUser | null;
  loading: boolean;
  setUser: (u: MobileUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return; }
    getMe()
      .then(setUser)
      .catch(() => { clearTokens(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
