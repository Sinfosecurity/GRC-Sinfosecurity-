import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { isPlatformStaff } from '../platform/roles';
import { portalLoginPath } from '../platform/portal';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const ADMIN_ROLES = new Set(['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN', 'PLATFORM_OWNER']);

function roleIsAllowed(userRole: string, allowedRoles: string[]): boolean {
  if (allowedRoles.includes(userRole)) {
    return true;
  }
  return allowedRoles.includes('ADMIN') && ADMIN_ROLES.has(userRole);
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const adminSurface = location.pathname.startsWith('/platform') || location.pathname.startsWith('/admin');
    return <Navigate to={adminSurface ? '/admin/login' : portalLoginPath()} state={{ from: location }} replace />;
  }

  if (user?.enrollOnly && !location.pathname.startsWith('/admin/mfa')) {
    return <Navigate to="/admin/mfa/enroll" replace />;
  }

  if (isPlatformStaff(user?.role) && location.pathname === '/dashboard') {
    return <Navigate to="/platform" replace />;
  }

  if (allowedRoles && user && !roleIsAllowed(user.role, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
