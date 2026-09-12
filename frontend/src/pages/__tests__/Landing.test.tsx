import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Landing from '../Landing';

const authState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => authState,
}));

function renderLanding() {
    return render(
        <MemoryRouter future={routerFuture}>
            <Landing />
        </MemoryRouter>
    );
}

describe('Landing Page', () => {
    beforeEach(() => {
        authState.isAuthenticated = false;
    });

    it('sells the platform instead of embedding a login form', () => {
        renderLanding();
        expect(screen.getByRole('heading', { name: /Govern the third parties that can put the business at risk/i })).toBeInTheDocument();
        expect(screen.getAllByText(/Supreme Governance Platform/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/A flagship product, then a connected platform/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Log In' })).not.toBeInTheDocument();
    });

    it('wires primary CTAs to demo, platform, sign-in, and product tour', () => {
        renderLanding();
        expect(screen.getAllByRole('link', { name: 'Request a Demo' })[0]).toHaveAttribute('href', '/request-demo');
        expect(screen.getAllByRole('link', { name: 'See the product tour' })[0]).toHaveAttribute('href', '/demo');
        expect(screen.getAllByRole('link', { name: 'Sign In' })[0]).toHaveAttribute('href', '/login');
        expect(screen.getAllByRole('link', { name: /Trust & Security/i })[0]).toHaveAttribute('href', '/trust');
        expect(screen.getByRole('link', { name: 'Explore Supreme Third Party' })).toHaveAttribute('href', '/products/third-party');
        expect(screen.getByText(/One shared governance foundation/i)).toBeInTheDocument();
        expect(screen.getByText(/Seven products\. One governance foundation/i)).toBeInTheDocument();
    });

    it('labels unfinished products instead of selling them as live', async () => {
        renderLanding();
        await userEvent.click(screen.getByRole('button', { name: 'Products' }));
        expect(screen.getAllByText('Supreme Third Party').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Roadmap').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Preview').length).toBeGreaterThan(0);
    });

    it('sends an authenticated visitor to the dashboard from the header', () => {
        authState.isAuthenticated = true;
        renderLanding();
        expect(screen.getAllByRole('link', { name: 'Launch Dashboard' })[0]).toHaveAttribute('href', '/dashboard');
    });

    it('does not render unverified commercial claims', () => {
        renderLanding();
        const banned = [
            /500\+/,
            /Enterprise Clients/i,
            /99\.9%/,
            /Uptime SLA/i,
            /24\/7/,
            /Expert Support/i,
            /ISO 27001 Compliant/i,
            /SOC 2 certified/i,
            /AI-powered GRC/i,
        ];
        for (const pattern of banned) {
            expect(screen.queryByText(pattern)).not.toBeInTheDocument();
        }
    });
});
