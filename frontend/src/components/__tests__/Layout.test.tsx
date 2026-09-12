import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import { AuthProvider } from '../../contexts/AuthContext';
import Layout from '../Layout';

describe('Layout Component', () => {
    it('renders sidebar with navigation items', () => {
        render(
            <MemoryRouter future={routerFuture}>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </MemoryRouter>
        );

        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Vendors/i)).toBeInTheDocument();
        expect(screen.getByText(/Assessments/i)).toBeInTheDocument();
    });

    it('displays user information in sidebar', () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem(
            'user',
            JSON.stringify({
                id: '1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'ORGANIZATION_ADMIN',
                organizationId: 'org1',
            })
        );

        render(
            <MemoryRouter future={routerFuture}>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </MemoryRouter>
        );

        expect(screen.getByText(/Sign out/i)).toBeInTheDocument();
        localStorage.clear();
    });
});
