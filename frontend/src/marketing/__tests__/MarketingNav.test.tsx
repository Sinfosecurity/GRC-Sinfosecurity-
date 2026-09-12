import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MarketingLayout from '../MarketingLayout';
import Pricing from '../../pages/Pricing';
import TrustCenter from '../../pages/TrustCenter';
import LegalDraft from '../../pages/LegalDraft';
import NotFound from '../../pages/NotFound';
import { routerFuture } from '../routerFuture';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
    }),
}));

function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]} future={routerFuture}>
            <Routes>
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/trust" element={<TrustCenter />} />
                <Route path="/privacy" element={<LegalDraft />} />
                <Route path="/products/:slug" element={<MarketingLayout><p>Shell</p></MarketingLayout>} />
                <Route path="/" element={<MarketingLayout><p>Shell</p></MarketingLayout>} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('Marketing navigation', () => {
    it('exposes enterprise nav destinations and sign-in', () => {
        renderAt('/');
        expect(screen.getAllByRole('link', { name: 'Sign In' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: 'Request a Demo' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: 'Trust' })[0]).toHaveAttribute('href', '/trust');
        expect(screen.getAllByRole('link', { name: 'Pricing' })[0]).toHaveAttribute('href', '/pricing');
    });

    it('opens the products menu with readiness labels', async () => {
        renderAt('/');
        await userEvent.click(screen.getByRole('button', { name: 'Products' }));
        expect(screen.getByRole('menuitem', { name: /Supreme Third Party/i })).toHaveAttribute('href', '/products/third-party');
        expect(screen.getByRole('menuitem', { name: /Supreme Privacy/i })).toHaveTextContent(/Roadmap/i);
    });

    it('keeps legal drafts from pretending counsel approved them', () => {
        renderAt('/privacy');
        expect(screen.getByRole('heading', { name: 'Privacy' })).toBeInTheDocument();
        expect(screen.getByText(/Draft — pending legal review/i)).toBeInTheDocument();
    });

    it('publishes commercial list prices and keeps Enterprise sales-led', () => {
        renderAt('/pricing');
        expect(screen.getByRole('heading', { name: /Straightforward pricing for serious governance/i })).toBeInTheDocument();
        expect(screen.getByText('$5,990/year')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Contact Sales' })).toHaveAttribute(
            'href',
            '/request-demo?source=pricing&selectedPlan=ENTERPRISE&intent=enterprise-sales'
        );
        expect(screen.queryByText(/Commercial prices are not published here/i)).not.toBeInTheDocument();
    });

    it('returns a marketing 404 for unknown routes', () => {
        renderAt('/this-route-does-not-exist');
        expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to homepage' })).toHaveAttribute('href', '/');
        expect(screen.getAllByRole('link', { name: 'See the product tour' })[0]).toHaveAttribute('href', '/demo');
    });

    it('closes the products menu on Escape and restores trigger focus', async () => {
        renderAt('/');
        const trigger = screen.getByRole('button', { name: 'Products' });
        expect(trigger).toHaveAttribute('aria-haspopup', 'true');
        await userEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await userEvent.keyboard('{Escape}');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveFocus();
    });
});
