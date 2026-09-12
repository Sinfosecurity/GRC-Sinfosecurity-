import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Pricing from '../Pricing';
import { routerFuture } from '../../marketing/routerFuture';
import {
    ANNUAL_SAVINGS_COPY,
    COMMERCIAL_PRICING_TIERS,
    hasStripePriceId,
} from '../../marketing/pricingCatalog';
import { ROUTE_META } from '../../marketing/PageMeta';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
    }),
}));

function renderPricing() {
    return render(
        <MemoryRouter future={routerFuture}>
            <Pricing />
        </MemoryRouter>
    );
}

describe('Commercial pricing page', () => {
    it('publishes transparent prices and removes the unpublished disclaimer', () => {
        renderPricing();
        expect(screen.getByRole('heading', { name: /Straightforward pricing for serious governance/i })).toBeInTheDocument();
        expect(screen.queryByText(/Commercial prices are not published here/i)).not.toBeInTheDocument();
        expect(screen.getByText('$5,990/year')).toBeInTheDocument();
        expect(screen.getByText('$14,990/year')).toBeInTheDocument();
        expect(screen.getByText('$29,990/year')).toBeInTheDocument();
        expect(screen.getByText('Custom pricing')).toBeInTheDocument();
        expect(screen.getByText('Starting from $59,000/year')).toBeInTheDocument();
        expect(screen.getAllByText('Billed annually').length).toBeGreaterThan(0);
        expect(screen.getByText(ANNUAL_SAVINGS_COPY)).toBeInTheDocument();
        expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('defaults to annual and switches to monthly without leaving the page', async () => {
        const user = userEvent.setup();
        renderPricing();
        expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'false');
        await user.click(screen.getByRole('button', { name: 'Monthly' }));
        expect(screen.getByText('$599/month')).toBeInTheDocument();
        expect(screen.getByText('$1,499/month')).toBeInTheDocument();
        expect(screen.getByText('$2,999/month')).toBeInTheDocument();
        expect(screen.getByText('Custom pricing')).toBeInTheDocument();
        expect(screen.queryByText('$99/month')).not.toBeInTheDocument();
        expect(screen.queryByText('$499/month')).not.toBeInTheDocument();
        expect(screen.queryByText('$1,999/month')).not.toBeInTheDocument();
    });

    it('routes Get Started to registration and sales CTAs to the lead form', () => {
        renderPricing();
        expect(screen.getAllByRole('link', { name: 'Get Started' })[0]).toHaveAttribute(
            'href',
            '/register?source=pricing&selectedPlan=STARTER&intent=get-started'
        );
        expect(screen.getAllByRole('link', { name: 'Get Started' })[1]).toHaveAttribute(
            'href',
            '/register?source=pricing&selectedPlan=PROFESSIONAL&intent=get-started'
        );
        expect(screen.getByRole('link', { name: 'Contact Sales' })).toHaveAttribute(
            'href',
            '/request-demo?source=pricing&selectedPlan=ENTERPRISE&intent=enterprise-sales'
        );
        expect(screen.getAllByRole('link', { name: 'Request a Demo' }).some((link) =>
            link.getAttribute('href') === '/request-demo?source=pricing&selectedPlan=BUSINESS&intent=demo'
        )).toBe(true);
        expect(screen.queryByRole('link', { name: /Buy Now/i })).not.toBeInTheDocument();
    });

    it('keeps commercial display prices off Stripe test price IDs', () => {
        const serialized = JSON.stringify(COMMERCIAL_PRICING_TIERS);
        expect(hasStripePriceId(serialized)).toBe(false);
        expect(serialized).not.toContain('price_1UEs');
    });

    it('includes a comparison table and truthful FAQ', () => {
        renderPricing();
        expect(screen.getByRole('heading', { name: 'Compare capabilities' })).toBeInTheDocument();
        expect(screen.getAllByText('Coming Soon').length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: 'Do you offer a trial?' })).toBeInTheDocument();
        expect(screen.getByText(/application-level trial/i)).toBeInTheDocument();
        expect(screen.getByText(/not by a Stripe trial period/i)).toBeInTheDocument();
        expect(ROUTE_META['/pricing'].title).toBe('Supreme Pricing | Third-Party Risk & Governance Platform');
    });
});
