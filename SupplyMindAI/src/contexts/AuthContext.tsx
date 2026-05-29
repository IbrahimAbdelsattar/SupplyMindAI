import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { apiFetch, setToken, getToken } from '@/lib/api';

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

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email: email?.trim(), password: password?.trim() }),
    });

    setToken(res.access_token);
    localStorage.setItem('supplymind_user', JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await apiFetch<User>('/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ name: name?.trim(), email: email?.trim(), password }),
    });
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem('supplymind_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = getToken();
    const rawUser = localStorage.getItem('supplymind_user');
    if (token && rawUser) {
      try {
        setUser(JSON.parse(rawUser) as User);
      } catch {
        // ignore
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, register, logout }),
    [user, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
