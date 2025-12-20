import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

interface UIState {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
    isLoading: boolean;
    loadingMessage: string | null;
}

const initialState: UIState = {
    sidebarOpen: true,
    theme: localStorage.getItem('theme') as 'light' | 'dark' || 'dark',
    notifications: [],
    isLoading: false,
    loadingMessage: null,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload;
            localStorage.setItem('theme', action.payload);
        },
        addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
            const notification: Notification = {
                ...action.payload,
                id: Date.now().toString(),
            };
            state.notifications.push(notification);
        },
        removeNotification: (state, action: PayloadAction<string>) => {
            state.notifications = state.notifications.filter((n) => n.id !== action.payload);
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },
        setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
            state.isLoading = action.payload.isLoading;
            state.loadingMessage = action.payload.message || null;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    setTheme,
    addNotification,
    removeNotification,
    clearNotifications,
    setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
