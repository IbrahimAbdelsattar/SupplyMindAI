import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

export type AppRole = 'admin' | 'manager' | 'analista' | 'vendedor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  orgId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  userRole: AppRole | null;
  isDomainValid: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  setRole: (role: AppRole) => void;
}

const ALLOWED_DOMAIN = 'supplymind.tech';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthContextProvider');
  }
  return context;
};

export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();

  // Internal state (set via setUser / setRole)
  const [internalUser, setInternalUser] = React.useState<AuthUser | null>(null);
  const [internalRole, setInternalRole] = React.useState<AppRole | null>(null);

  // Domain validation from Clerk email
  const email = clerkUser?.primaryEmailAddress?.emailAddress || '';
  const domain = email.split('@')[1] || '';
  const isDomainValid = !isSignedIn || domain === ALLOWED_DOMAIN;

  // Sync Clerk user -> internal state on mount / user change
  useEffect(() => {
    if (isSignedIn && clerkUser && !internalUser) {
      const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress || '';
      const clerkDomain = clerkEmail.split('@')[1];

      if (clerkDomain !== ALLOWED_DOMAIN) {
        // Don't create auth user for non-corporate domains
        return;
      }

      // Determine role from Clerk publicMetadata if available
      const metaRole = (clerkUser.publicMetadata as Record<string, unknown>)?.role;
      const role: AppRole =
        metaRole && ['admin', 'manager', 'analista', 'vendedor'].includes(metaRole as string)
          ? (metaRole as AppRole)
          : 'analista';

      setInternalUser({
        id: clerkUser.id,
        email: clerkEmail,
        name: clerkUser.fullName || clerkEmail.split('@')[0],
        role,
        orgId: (clerkUser.organization?.id as string) || 'default',
      });
      setInternalRole(role);
    }

    if (!isSignedIn) {
      setInternalUser(null);
      setInternalRole(null);
    }
  }, [isSignedIn, clerkUser, internalUser]);

  // Track previous sign-in state to perform a hard refresh on sign-out
  const [wasSignedIn, setWasSignedIn] = React.useState(isSignedIn);
  
  useEffect(() => {
    if (wasSignedIn && !isSignedIn && isLoaded) {
      window.location.href = '/';
    }
    setWasSignedIn(isSignedIn);
  }, [isSignedIn, wasSignedIn, isLoaded]);

  const setUser = useCallback((user: AuthUser) => {
    setInternalUser(user);
    setInternalRole(user.role);
  }, []);

  const setRole = useCallback((role: AppRole) => {
    setInternalRole(role);
    setInternalUser((prev) => (prev ? { ...prev, role } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: internalUser,
        userRole: internalRole,
        isDomainValid,
        isLoading: !isLoaded,
        setUser,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
