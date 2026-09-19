import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import { AuthProvider } from '../../contexts/AuthContext';
import ProtectedRoute from '../ProtectedRoute';

vi.mock('../../services/api', () => ({
    authAPI: {
        getCurrentUser: vi.fn().mockResolvedValue({
            data: {
                data: {
                    user: {
                        id: '1',
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User',
                        role: 'VIEWER',
                        organizationId: 'org1',
                    },
                },
            },
        }),
        logout: vi.fn().mockResolvedValue({}),
    },
}));

describe('ProtectedRoute', () => {
    beforeEach(() => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem(
            'user',
            JSON.stringify({
                id: '1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'VIEWER',
                organizationId: 'org1',
            })
        );
    });

    it('renders children when authenticated', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <AuthProvider>
                    <ProtectedRoute>
                        <div>Protected Content</div>
                    </ProtectedRoute>
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    it('keeps a requester-only session out of the GRC workspace', async () => {
        localStorage.setItem(
            'user',
            JSON.stringify({
                id: 'req-1',
                email: 'pat@example.test',
                firstName: 'Pat',
                lastName: 'Requester',
                role: 'BUSINESS_OWNER',
                organizationId: 'org1',
                permissions: ['intake.create_own', 'intake.read_own', 'intake.respond_own'],
            })
        );
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/dashboard']}>
                <AuthProvider>
                    <ProtectedRoute workspace="grc">
                        <div>GRC shell</div>
                    </ProtectedRoute>
                </AuthProvider>
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.queryByText('GRC shell')).not.toBeInTheDocument();
        });
    });
});
