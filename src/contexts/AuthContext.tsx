import React, { createContext, useCallback, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/clerk-react';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useUser();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();


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

  const login = useCallback(async (email: string, password: string) => {
    if (!signInLoaded || !signIn || !setActive) {
      throw new Error('Authentication is still loading. Please try again.');
    }

    const result = await signIn.create({
      identifier: email,
      password,
    });

    if (result.status !== 'complete' || !result.createdSessionId) {
      throw new Error('Additional authentication steps are required.');
    }

    await setActive({ session: result.createdSessionId });
  }, [signInLoaded, signIn, setActive]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!signUpLoaded || !signUp || !setSignUpActive) {
      throw new Error('Authentication is still loading. Please try again.');
    }

    const result = await signUp.create({
      emailAddress: email,
      password,
      firstName: name,
    });

    if (result.status !== 'complete' || !result.createdSessionId) {
      throw new Error('Account created. Please complete verification to continue.');
    }

    await setSignUpActive({ session: result.createdSessionId });
  }, [signUpLoaded, signUp, setSignUpActive]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!isSignedIn,
      isLoading,
      login,
      register,
      logout,
    }),
    [isSignedIn, isLoading, login, logout, register, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
