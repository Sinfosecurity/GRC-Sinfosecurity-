import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import { AuthProvider } from '../../contexts/AuthContext';
import ProtectedRoute from '../ProtectedRoute';
import { authAPI } from '../../services/api';

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
        const requester = {
            id: 'req-1',
            email: 'pat@example.test',
            firstName: 'Pat',
            lastName: 'Requester',
            role: 'BUSINESS_OWNER',
            organizationId: 'org1',
            permissions: ['intake.create_own', 'intake.read_own', 'intake.respond_own'],
        };
        vi.mocked(authAPI.getCurrentUser).mockResolvedValue({ data: { data: { user: requester } } } as any);
        localStorage.setItem('user', JSON.stringify(requester));
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

    it('keeps a GRC practitioner out of the requester workspace', async () => {
        const analyst = {
            id: 'ana-1',
            email: 'ana@example.test',
            firstName: 'Ana',
            lastName: 'Lyst',
            role: 'ASSESSOR',
            organizationId: 'org1',
            permissions: ['vendor.read', 'intake.read', 'intake.triage', 'intake.create_own'],
        };
        vi.mocked(authAPI.getCurrentUser).mockResolvedValue({ data: { data: { user: analyst } } } as any);
        localStorage.setItem('user', JSON.stringify(analyst));
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/request']}>
                <AuthProvider>
                    <ProtectedRoute workspace="requester">
                        <div>Requester shell</div>
                    </ProtectedRoute>
                </AuthProvider>
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.queryByText('Requester shell')).not.toBeInTheDocument();
        });
    });

    it('keeps a TPRM Lead out of the requester workspace', async () => {
        const lead = {
            id: 'lead-1',
            email: 'lead@example.test',
            firstName: 'QA',
            lastName: 'TPRM Lead',
            role: 'RISK_MANAGER',
            organizationId: 'org1',
            permissions: ['vendor.read', 'intake.read', 'intake.assign', 'intake.triage'],
        };
        vi.mocked(authAPI.getCurrentUser).mockResolvedValue({ data: { data: { user: lead } } } as any);
        localStorage.setItem('user', JSON.stringify(lead));
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/request']}>
                <AuthProvider>
                    <ProtectedRoute workspace="requester">
                        <div>Requester shell</div>
                    </ProtectedRoute>
                </AuthProvider>
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.queryByText('Requester shell')).not.toBeInTheDocument();
        });
    });
});
