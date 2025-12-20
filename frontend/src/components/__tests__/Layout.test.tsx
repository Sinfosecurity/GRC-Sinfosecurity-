import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import vendorReducer from '../../store/slices/vendorSlice';
import Layout from '../Layout';

const createMockStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer,
            ui: uiReducer,
            vendor: vendorReducer,
        },
        preloadedState: {
            auth: {
                user: {
                    id: '1',
                    email: 'test@example.com',
                    name: 'Test User',
                    role: 'admin',
                    organizationId: 'org1',
                    permissions: [],
                },
                token: 'test-token',
                refreshToken: 'test-refresh',
                isAuthenticated: true,
                isLoading: false,
                error: null,
            },
            ui: {
                sidebarOpen: true,
                theme: 'dark',
                notifications: [],
                isLoading: false,
                loadingMessage: null,
            },
            vendor: {
                vendors: [],
                selectedVendor: null,
                statistics: null,
                isLoading: false,
                error: null,
                filters: {},
            },
        },
    });
};

describe('Layout Component', () => {
    it('renders sidebar with navigation items', () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Layout />
                </BrowserRouter>
            </Provider>
        );

        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Risk Management/i)).toBeInTheDocument();
        expect(screen.getByText(/Compliance/i)).toBeInTheDocument();
    });

    it('displays user information in sidebar', () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Layout />
                </BrowserRouter>
            </Provider>
        );

        expect(screen.getByText(/Test User/i)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
});
