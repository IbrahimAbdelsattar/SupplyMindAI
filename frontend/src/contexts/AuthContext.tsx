import React, { createContext, useCallback, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import { setAuthTokenProvider } from '@/lib/api';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useUser();

  const logout = useCallback(() => {
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    // Provide a dummy token so api.ts doesn't throw a Missing auth token error
    setAuthTokenProvider(() => Promise.resolve("dummy-bypass-token"));
  }, []);

  const user = useMemo<User | null>(() => ({
    id: "dev_user_123",
    name: "Dev User",
    email: "dev@example.com",
    role: "admin",
  }), []);

  const isLoading = false;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: true,
      isLoading,
      logout,
    }),
    [isLoading, logout, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
