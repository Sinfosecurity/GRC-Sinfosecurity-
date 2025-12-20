import { useEffect } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { removeNotification } from '../store/slices/uiSlice';

export default function NotificationManager() {
    const dispatch = useAppDispatch();
    const notifications = useAppSelector((state) => state.ui.notifications);

    const handleClose = (id: string) => {
        dispatch(removeNotification(id));
    };

    useEffect(() => {
        // Auto-remove notifications after their duration
        notifications.forEach((notification) => {
            const duration = notification.duration || 5000;
            const timer = setTimeout(() => {
                dispatch(removeNotification(notification.id));
            }, duration);

            return () => clearTimeout(timer);
        });
    }, [notifications, dispatch]);

    // Display the most recent notification
    const currentNotification = notifications[notifications.length - 1];

    if (!currentNotification) return null;

    return (
        <Snackbar
            open={true}
            autoHideDuration={currentNotification.duration || 5000}
            onClose={() => handleClose(currentNotification.id)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Alert
                onClose={() => handleClose(currentNotification.id)}
                severity={currentNotification.type as AlertColor}
                sx={{ width: '100%' }}
                variant="filled"
            >
                {currentNotification.message}
            </Alert>
        </Snackbar>
    );
}
