import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import vendorReducer from '../../store/slices/vendorSlice';
import Landing from '../Landing';

// Create a mock store for testing
const createMockStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer,
            ui: uiReducer,
            vendor: vendorReducer,
        },
    });
};

describe('Landing Page', () => {
    it('renders landing page with title', () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Landing />
                </BrowserRouter>
            </Provider>
        );

        expect(screen.getByText(/Governance, Risk & Compliance/i)).toBeInTheDocument();
    });

    it('renders sign in form', () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Landing />
                </BrowserRouter>
            </Provider>
        );

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('displays demo button', () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Landing />
                </BrowserRouter>
            </Provider>
        );

        expect(screen.getByText(/Continue as Demo User/i)).toBeInTheDocument();
    });
});
