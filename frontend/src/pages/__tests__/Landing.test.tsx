import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../Landing';

const navigate = vi.fn();
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

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigate,
    };
});

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
        navigate.mockReset();
        authState.isAuthenticated = false;
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('renders Supreme Risk and the development preview banner in Vite dev', () => {
        renderLanding();
        expect(screen.getAllByText(/Supreme Risk/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/DEVELOPMENT PREVIEW/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/SUPREME GOVERNANCE PLATFORM/i)).toBeInTheDocument();
        expect(screen.getByText(/Govern Risk/i)).toBeInTheDocument();
    });

    it('renders the sign-in form', () => {
        renderLanding();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
    });

    it('sends an unauthenticated Launch Dashboard click to the on-page login form', async () => {
        renderLanding();
        const email = screen.getByLabelText(/email/i);
        await userEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));
        expect(navigate).not.toHaveBeenCalledWith('/dashboard');
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        expect(email).toHaveFocus();
    });

    it('sends an authenticated Launch Dashboard click to /dashboard', async () => {
        authState.isAuthenticated = true;
        renderLanding();
        await userEvent.click(screen.getByRole('button', { name: 'Launch Dashboard' }));
        expect(navigate).toHaveBeenCalledWith('/dashboard');
    });

    it('wires View Demo to the read-only demo tour', async () => {
        renderLanding();
        await userEvent.click(screen.getByRole('button', { name: /View Demo/i }));
        expect(navigate).toHaveBeenCalledWith('/demo');
    });

    it('sends Sign In to the real login route', async () => {
        renderLanding();
        await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
        expect(navigate).toHaveBeenCalledWith('/login');
    });

    it('sends Get Started to the signup route', async () => {
        renderLanding();
        await userEvent.click(screen.getByRole('button', { name: 'Get Started' }));
        expect(navigate).toHaveBeenCalledWith('/register');
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
            /NEXT GEN GRC/i,
            /Intelligent GRC/i,
        ];
        for (const pattern of banned) {
            expect(screen.queryByText(pattern)).not.toBeInTheDocument();
        }
        expect(screen.getAllByText(/EXPLAINABLE RISK/i).length).toBeGreaterThan(0);
        expect(screen.getByText('DECISION READY')).toBeInTheDocument();
        expect(screen.getByText('TENANT ISOLATED')).toBeInTheDocument();
    });

    it('has an onClick for every primary CTA', () => {
        renderLanding();
        for (const name of ['Sign In', 'Get Started', 'Sign In to Dashboard', 'View Demo', 'Log In']) {
            expect(screen.getByRole('button', { name })).toBeEnabled();
        }
    });
});
