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
    void clerk.signOut().catch(() => undefined);
  }, [clerk]);

  useMemo(() => {
    setAuthTokenProvider(() => getToken());
  }, [getToken]);

  const user = useMemo<User | null>(() => {
    if (!clerkUser) {
      return null;
    }

    const displayName =
      clerkUser.fullName ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.username ||
      'User';

    const role = (clerkUser.publicMetadata?.role as string | undefined) ||
      (clerkUser.unsafeMetadata?.role as string | undefined);

    return {
      id: clerkUser.id,
      name: displayName,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      role,
      avatar: clerkUser.imageUrl,
    };
  }, [clerkUser]);

  const isLoading = !(authLoaded && userLoaded);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!isSignedIn,
      isLoading,
      logout,
    }),
    [isSignedIn, isLoading, logout, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
