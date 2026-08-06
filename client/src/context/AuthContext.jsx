import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuth, getCachedUser, clearAuth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCachedUser());
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.me();
      setUser(data);
      localStorage.setItem('hof_user', JSON.stringify(data));
      return data;
    } catch {
      setUser(null);
      clearAuth();
      return null;
    }
  };

  const login = async (phone, password) => {
    const data = await api.login({ phone, password });
    setAuth(data.token, data.user, data.refreshToken);
    setUser(data.user);
    return data;
  };

  const register = async (phone, password, nickname, inviteCode) => {
    const data = await api.register({ phone, password, nickname, inviteCode });
    setAuth(data.token, data.user, data.refreshToken);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  useEffect(() => {
    if (getCachedUser()) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
