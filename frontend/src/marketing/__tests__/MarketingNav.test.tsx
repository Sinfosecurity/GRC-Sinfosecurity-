import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MarketingLayout from '../MarketingLayout';
import Pricing from '../../pages/Pricing';
import TrustCenter from '../../pages/TrustCenter';
import MarketingPlaceholder from '../../pages/MarketingPlaceholder';

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
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/trust" element={<TrustCenter />} />
                <Route path="/privacy" element={<MarketingPlaceholder />} />
                <Route path="/status" element={<MarketingPlaceholder />} />
                <Route path="/products/:slug" element={<MarketingPlaceholder />} />
                <Route path="*" element={<MarketingLayout><p>Shell</p></MarketingLayout>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('Marketing navigation', () => {
    it('exposes enterprise nav destinations and sign-in', () => {
        renderAt('/');
        expect(screen.getAllByRole('link', { name: 'Sign In' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: 'Request Demo' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: 'Trust' })[0]).toHaveAttribute('href', '/trust');
        expect(screen.getAllByRole('link', { name: 'Pricing' })[0]).toHaveAttribute('href', '/pricing');
    });

    it('opens the products menu with readiness labels', async () => {
        renderAt('/');
        await userEvent.click(screen.getByRole('button', { name: 'Products' }));
        expect(screen.getByRole('menuitem', { name: /Supreme Third Party/i })).toHaveAttribute('href', '/products/third-party');
        expect(screen.getByRole('menuitem', { name: /Supreme Privacy/i })).toHaveTextContent(/Roadmap/i);
    });

    it('keeps legal and product routes from 404ing', () => {
        renderAt('/privacy');
        expect(screen.getByRole('heading', { name: 'Privacy' })).toBeInTheDocument();
        expect(screen.getByText(/Coming soon/i)).toBeInTheDocument();
        renderAt('/products/privacy');
        expect(screen.getByRole('heading', { name: 'Supreme Privacy' })).toBeInTheDocument();
    });

    it('prices with Contact Sales instead of invented numbers', () => {
        renderAt('/pricing');
        expect(screen.getByText(/Plans for growing teams and enterprise organizations/i)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Contact Sales' })[0]).toHaveAttribute('href', '/request-demo');
        expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
});
