import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Landing from '../Landing';

describe('Landing Page', () => {
    it('renders landing page with title', () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Landing />
                </AuthProvider>
            </MemoryRouter>
        );

        expect(screen.getByText(/Supreme Risk/i)).toBeInTheDocument();
    });

    it('renders sign in form', () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Landing />
                </AuthProvider>
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('displays demo button', () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Landing />
                </AuthProvider>
            </MemoryRouter>
        );

        expect(screen.getByText(/View Demo/i)).toBeInTheDocument();
    });
});
