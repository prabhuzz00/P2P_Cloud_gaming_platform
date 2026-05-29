import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

const getStoredUser = () => {
  const rawUser = localStorage.getItem('adminUser');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem('adminUser');
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken'));
  const [adminUser, setAdminUser] = useState(getStoredUser);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const login = useCallback(async (credentials) => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await client.post('/auth/login', credentials);
      const nextToken = response.data?.token || response.data?.data?.token;
      const nextAdmin = response.data?.admin || response.data?.data?.admin || response.data?.user || response.data?.data?.user;

      if (!nextToken) {
        throw new Error('The login response did not include a token.');
      }

      localStorage.setItem('adminToken', nextToken);
      localStorage.setItem('adminUser', JSON.stringify(nextAdmin || { name: 'Administrator', email: credentials.email }));
      setToken(nextToken);
      setAdminUser(nextAdmin || { name: 'Administrator', email: credentials.email });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to sign in.';
      setAuthError(message);
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(null);
    setAdminUser(null);
    setAuthError('');
  }, []);

  const value = useMemo(
    () => ({
      adminUser,
      authError,
      authLoading,
      isAuthenticated: Boolean(token),
      login,
      logout,
      token,
    }),
    [adminUser, authError, authLoading, login, logout, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
