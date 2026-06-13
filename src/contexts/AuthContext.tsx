import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { apiFetch, getToken, setToken } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type LoginResponse = {
  access_token: string;
  token_type: 'bearer';
  user: User;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    void apiFetch('/auth/signout', { method: 'POST' })
      .catch(() => undefined)
      .finally(() => setToken(null));
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!getToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await apiFetch<{ user: User }>('/auth/me');
        setUser(response.user);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    void restoreSession();
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<LoginResponse>('/auth/signin', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await apiFetch<LoginResponse>('/auth/signup', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ name, email, password }),
    });
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [isLoading, login, logout, register, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
