import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';


const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  manager: 3,
  analyst: 2,
  viewer: 1,
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'analyst' | 'viewer';
}

export const ProtectedRoute = ({
  children,
  requiredRole
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, userRole, isLoading } = useAuthContext();

  // Show nothing while checking auth state
  if (isLoading) {
    return null;
  }

  // Not authenticated — redirect to login with return URL
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRole && userRole) {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    if (userLevel < requiredLevel) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
