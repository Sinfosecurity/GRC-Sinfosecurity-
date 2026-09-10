import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
            <MemoryRouter>
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
});
