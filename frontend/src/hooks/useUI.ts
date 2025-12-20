import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addNotification } from '../store/slices/uiSlice';

interface ToastOptions {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

/**
 * Hook to display toast notifications using Redux
 */
export const useToast = () => {
    const dispatch = useAppDispatch();

    const showToast = ({ message, type = 'info', duration = 5000 }: ToastOptions) => {
        dispatch(addNotification({ message, type, duration }));
    };

    return {
        success: (message: string, duration?: number) => showToast({ message, type: 'success', duration }),
        error: (message: string, duration?: number) => showToast({ message, type: 'error', duration }),
        warning: (message: string, duration?: number) => showToast({ message, type: 'warning', duration }),
        info: (message: string, duration?: number) => showToast({ message, type: 'info', duration }),
    };
};

/**
 * Hook to manage loading states
 */
export const useLoading = () => {
    const dispatch = useAppDispatch();

    const setLoading = (isLoading: boolean, message?: string) => {
        dispatch({ type: 'ui/setLoading', payload: { isLoading, message } });
    };

    return { setLoading };
};

/**
 * Auto-dismiss notifications after duration
 */
export const useNotificationCleanup = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const interval = setInterval(() => {
            // This would be handled by the notification component itself
            // Just a placeholder for cleanup logic
        }, 1000);

        return () => clearInterval(interval);
    }, [dispatch]);
};
