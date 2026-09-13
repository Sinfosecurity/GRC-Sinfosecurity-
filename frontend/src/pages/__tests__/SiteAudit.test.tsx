import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../Login';
import Register from '../Register';
import ForgotPassword from '../ForgotPassword';
import Activate from '../Activate';
import ResetPassword from '../ResetPassword';
import RequestDemo from '../RequestDemo';
import ThirdPartyProduct from '../ThirdPartyProduct';
import PublicStatus from '../PublicStatus';
import Frameworks from '../Frameworks';
import { contrastRatio } from '../../marketing/contrast';
import { metaForPath, robotsPolicy, robotsPolicyForPath, ROUTE_META } from '../../marketing/PageMeta';
import { routerFuture } from '../../marketing/routerFuture';

const marketingCss = readFileSync(path.join(__dirname, '../../marketing/marketing.css'), 'utf8');

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
    }),
}));

vi.mock('../../services/api', () => ({
    demoAPI: { request: vi.fn() },
    authAPI: { forgotPassword: vi.fn(), resetPassword: vi.fn(), activate: vi.fn() },
}));

function renderPath(path: string, element: ReactNode) {
    return render(
        <MemoryRouter initialEntries={[path]} future={routerFuture}>
            <Routes>
                <Route path="*" element={element} />
            </Routes>
        </MemoryRouter>
    );
}

describe('site audit remediation', () => {
    it('keeps gold-background ink at AA contrast', () => {
        expect(contrastRatio('#141A21', '#C6A46B')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#141A21', '#D7B67A')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#D5DBE1', '#0B1520')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#C5CDD4', '#071018')).toBeGreaterThanOrEqual(4.5);
        expect(marketingCss).toMatch(/\.supreme-marketing a\.mkt-btn-gold/);
        expect(marketingCss).toMatch(/--gold-ink:\s*#141a21/i);
        expect(marketingCss).toMatch(/--gold:\s*#c6a46b/i);
        expect(contrastRatio('#735A2C', '#F4EFE6')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#655E52', '#F4EFE6')).toBeGreaterThanOrEqual(4.5);
        expect(marketingCss).toMatch(/--paper-kicker:\s*#735a2c/i);
        expect(marketingCss).toMatch(/--paper-muted:\s*#655e52/i);
        expect(marketingCss).not.toMatch(/#8a6d38/i);
        expect(marketingCss).not.toMatch(/#7a7164/i);
        expect(marketingCss).toMatch(/@media \(max-width: 767px\)[\s\S]*\.mkt-price-grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
        expect(marketingCss).toMatch(/overflow-x:\s*hidden/);
    });

    it('defines per-route titles for public marketing pages', () => {
        expect(metaForPath('/').title).toBe('Supreme — Connected Governance Platform');
        expect(metaForPath('/products/third-party').title).toContain('Supreme Third Party');
        expect(metaForPath('/demo').title).toBe('Product Tour — Supreme');
        expect(ROUTE_META['/request-demo'].title).toBe('Request a Demo — Supreme');
        expect(robotsPolicy({ VITE_ENVIRONMENT: 'staging' })).toBe('noindex,nofollow');
        expect(robotsPolicy({ VITE_ENVIRONMENT: 'private-beta' })).toBe('noindex,nofollow');
        expect(robotsPolicy({ VITE_ENVIRONMENT: 'production', DEV: false })).toBe('index,follow');
        const production = { VITE_ENVIRONMENT: 'production', DEV: false };
        expect(robotsPolicyForPath('/', production)).toBe('index,follow');
        expect(robotsPolicyForPath('/pricing', production)).toBe('index,follow');
        expect(robotsPolicyForPath('/products/third-party', production)).toBe('index,follow');
        expect(robotsPolicyForPath('/admin', production)).toBe('noindex,nofollow');
        expect(robotsPolicyForPath('/admin/login', production)).toBe('noindex,nofollow');
        expect(robotsPolicyForPath('/platform', production)).toBe('noindex,nofollow');
        expect(robotsPolicyForPath('/dashboard', production)).toBe('noindex,nofollow');
        expect(robotsPolicyForPath('/login', production)).toBe('noindex,nofollow');
        expect(robotsPolicyForPath('/', production, 'admin.supremerisk.com')).toBe('noindex,nofollow');
    });

    it('wraps register and forgot-password in the marketing shell', () => {
        renderPath('/register', <Register />);
        expect(document.getElementById('main')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Create your organization' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Request a Demo' }).length).toBeGreaterThan(0);
        expect(screen.getByLabelText('First name')).toHaveAttribute('autocomplete', 'given-name');
        expect(screen.getByLabelText('Last name')).toHaveAttribute('autocomplete', 'family-name');
        expect(screen.getByLabelText('Organization')).toHaveAttribute('autocomplete', 'organization');
        expect(screen.getByLabelText('Work email')).toHaveAttribute('autocomplete', 'username');
        expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    });

    it('sets login and reset autocomplete attributes', () => {
        const login = renderPath('/login', <Login />);
        expect(login.getByLabelText('Work email')).toHaveAttribute('autocomplete', 'username');
        expect(login.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
        login.unmount();
        const reset = renderPath('/forgot-password', <ForgotPassword />);
        expect(reset.getByLabelText('Work email')).toHaveAttribute('autocomplete', 'username');
        reset.unmount();
        const activate = renderPath('/activate?token=test-token', <Activate />);
        expect(activate.getByLabelText('First name')).toHaveAttribute('autocomplete', 'given-name');
        expect(activate.getByLabelText('Last name')).toHaveAttribute('autocomplete', 'family-name');
        expect(activate.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
        expect(ROUTE_META['/activate'].title).toBe('Activate account — Supreme');
        activate.unmount();
        const choose = renderPath('/reset-password?token=test-token', <ResetPassword />);
        expect(choose.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
        expect(ROUTE_META['/reset-password'].title).toBe('Choose a new password — Supreme');
    });

    it('sets request-demo autocomplete and preserves pricing intent', () => {
        renderPath('/request-demo?intent=pricing&plan=Professional', <RequestDemo />);
        expect(screen.getByRole('heading', { name: /Contact sales about the Professional plan/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Name')).toHaveAttribute('autocomplete', 'name');
        expect(screen.getByLabelText('Business email')).toHaveAttribute('autocomplete', 'email');
        expect(screen.getByRole('textbox', { name: 'Company' })).toHaveAttribute('autocomplete', 'organization');
        expect(screen.getByText(/Selected plan: Professional/)).toBeInTheDocument();
    });

    it('carries pricing signup metadata onto registration', () => {
        renderPath('/register?source=pricing&selectedPlan=STARTER&intent=get-started', <Register />);
        expect(screen.getByText(/Selected plan: STARTER/)).toBeInTheDocument();
        expect(screen.getByText(/Intent: get-started/)).toBeInTheDocument();
    });

    it('presents Third Party as an available product, not a stub', () => {
        renderPath('/products/third-party', <ThirdPartyProduct />);
        expect(screen.getByRole('heading', { name: /Third-party risk you can explain/i })).toBeInTheDocument();
        expect(screen.getByText(/Vendor lifecycle/i)).toBeInTheDocument();
        expect(screen.getByText(/Decision Briefs and approvals/i)).toBeInTheDocument();
        expect(screen.queryByText(/Coming soon/i)).not.toBeInTheDocument();
    });

    it('states public status is NOT_CONFIGURED and explains frameworks without certifying', () => {
        renderPath('/status', <PublicStatus />);
        expect(screen.getByText(/NOT_CONFIGURED/)).toBeInTheDocument();
        expect(screen.queryByText(/99\.9%/)).not.toBeInTheDocument();
        renderPath('/frameworks', <Frameworks />);
        expect(screen.getByText(/Supreme does not certify customers/i)).toBeInTheDocument();
        expect(screen.getByText('NIST')).toBeInTheDocument();
    });
});
