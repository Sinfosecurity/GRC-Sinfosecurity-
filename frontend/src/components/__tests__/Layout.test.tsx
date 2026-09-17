import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

        expect(screen.getAllByText(/^Home$/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Third Parties/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Assessments/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^Supreme$/i).length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        expect(screen.getByLabelText('Account menu')).toBeInTheDocument();
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

        expect(screen.getAllByText(/Test/i).length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByRole('button', { name: 'Administration' })[0]);
        expect(screen.getAllByText(/Team/i).length).toBeGreaterThan(0);
        localStorage.clear();
    });

    it('hides administration from viewers', () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem(
            'user',
            JSON.stringify({
                id: '2',
                email: 'viewer@example.com',
                firstName: 'View',
                lastName: 'Er',
                role: 'VIEWER',
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

        expect(screen.getAllByText(/Third Parties/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/^Team$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Billing/i)).not.toBeInTheDocument();
        localStorage.clear();
    });
});
