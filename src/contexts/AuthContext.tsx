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
  const mockUser: User = {
    id: "demo-user",
    name: "Demo User",
    email: "demo@supplymind.ai",
    role: "admin",
  };

  const value = useMemo(
    () => ({ 
      user: mockUser, 
      isAuthenticated: true, 
      login: async () => {}, 
      register: async () => {}, 
      logout: () => {} 
    }),
    []
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
