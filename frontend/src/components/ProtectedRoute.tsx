import React, { useEffect } from 'react';
import { useAuth, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthContext } from '@/contexts/AuthContext';


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
  const { userRole, isDomainValid } = useAuthContext();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {

    }
  }, [isLoaded, isSignedIn, user, navigate]);

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
