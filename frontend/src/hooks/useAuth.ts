import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchCurrentUser } from '../store/slices/authSlice';

/**
 * Hook to check authentication status and redirect if not authenticated
 */
export const useAuth = (requireAuth = true) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (requireAuth && !isLoading && !isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, isLoading, navigate, requireAuth]);

    useEffect(() => {
        // Fetch user data if authenticated but user data is missing
        if (isAuthenticated && !user && !isLoading) {
            dispatch(fetchCurrentUser());
        }
    }, [isAuthenticated, user, isLoading, dispatch]);

    return { isAuthenticated, user, isLoading };
};

/**
 * Hook to check if user has specific permission
 */
export const usePermission = (permission: string): boolean => {
    const { user } = useAppSelector((state) => state.auth);
    
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    
    return user.permissions?.includes(permission) || false;
};

/**
 * Hook to check if user has specific role
 */
export const useRole = (roles: string | string[]): boolean => {
    const { user } = useAppSelector((state) => state.auth);
    
    if (!user) return false;
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
};
