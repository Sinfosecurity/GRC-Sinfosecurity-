import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Login from '../Login';

const discoverSso = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
    }),
}));

vi.mock('../../services/api', () => ({
    authAPI: {
        discoverSso: (...args: unknown[]) => discoverSso(...args),
    },
}));

describe('Login SSO discovery', () => {
    beforeEach(() => {
        discoverSso.mockReset();
    });

    it('keeps work-email password sign-in until discovery finds a ready Company SSO domain', async () => {
        discoverSso.mockResolvedValue({ data: { data: { ssoAvailable: false } } });
        const user = userEvent.setup();
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/login']}>
                <Login />
            </MemoryRouter>,
        );
        expect(screen.queryByRole('link', { name: /Continue with Company SSO/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Microsoft|Okta|Google/i })).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('Work email'), 'person@acme.test');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(discoverSso).toHaveBeenCalledWith('person@acme.test');
        expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Continue with Company SSO/i })).not.toBeInTheDocument();
    });

    it('shows Continue with Company SSO only after a verified, ready domain is discovered', async () => {
        discoverSso.mockResolvedValue({
            data: { data: { ssoAvailable: true, publicId: 'idp_ready', continueLabel: 'Continue with Company SSO' } },
        });
        const user = userEvent.setup();
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/login']}>
                <Login />
            </MemoryRouter>,
        );
        await user.type(screen.getByLabelText('Work email'), 'person@acme.test');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(await screen.findByRole('link', { name: 'Continue with Company SSO' })).toBeInTheDocument();
    });
});
