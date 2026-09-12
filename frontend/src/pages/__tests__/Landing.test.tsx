import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
        <MemoryRouter>
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
        expect(screen.getByRole('heading', { name: /Govern everything that can put your business at risk/i })).toBeInTheDocument();
        expect(screen.getAllByText(/Supreme Governance Platform/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/One platform. Seven governance products/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Log In' })).not.toBeInTheDocument();
    });

    it('wires primary CTAs to demo, platform, sign-in, and product tour', () => {
        renderLanding();
        expect(screen.getAllByRole('link', { name: 'Request a Demo' })[0]).toHaveAttribute('href', '/request-demo');
        expect(screen.getByRole('link', { name: 'Explore the Platform' })).toHaveAttribute('href', '#platform');
        expect(screen.getAllByRole('link', { name: 'Sign In' })[0]).toHaveAttribute('href', '/login');
        expect(screen.getAllByRole('link', { name: 'View Demo' })[0]).toHaveAttribute('href', '/demo');
        expect(screen.getAllByRole('link', { name: /View Trust/i })[0]).toHaveAttribute('href', '/trust');
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
