import React, { useEffect } from 'react';
import { useAuth, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthContext } from '@/contexts/AuthContext';

const ALLOWED_DOMAIN = 'supplymind.tech';

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  manager: 3,
  analista: 2,
  vendedor: 1,
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'analista' | 'vendedor';
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setUser, userRole, isDomainValid } = useAuthContext();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Sync Clerk user to AuthContext
      if (!useAuthContext.getState().user) {
        setUser({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
          role: userRole || 'analista',
          orgId: user.organization?.id || 'default',
        });
      }

      // Domain check
      const email = user.primaryEmailAddress?.emailAddress || '';
      const domain = email.split('@')[1];
      if (domain !== ALLOWED_DOMAIN) {
        navigate('/unauthorized', { replace: true });
        return;
      }
    }
  }, [isLoaded, isSignedIn, user, setUser, userRole, navigate]);

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Domain validation
  if (!isDomainValid) {
    return null; // Navigation already handled in useEffect
  }

  // Role-based access control
  if (requiredRole && userRole) {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    
    if (userLevel < requiredLevel) {
      return null; // Navigation already handled in useEffect
    }
  }

  return <>{children}</>;
};
