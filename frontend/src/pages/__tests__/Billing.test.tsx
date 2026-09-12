import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Billing from '../Billing';

vi.mock('../../services/api', () => ({
    billingAPI: {
        status: () => Promise.resolve({
            data: {
                data: {
                    provider: 'CONNECTED',
                    plan: 'STARTER',
                    billingInterval: 'month',
                    subscriptionStatus: 'active',
                    organizationStatus: 'ACTIVE',
                    billingCustomerId: 'cus_test',
                    billingSubscriptionId: 'sub_test',
                    cancelAtPeriodEnd: false,
                },
            },
        }),
        checkout: vi.fn(),
        portal: vi.fn(),
    },
}));

describe('Billing', () => {
    it('renders authoritative plan state and checkout actions without price IDs', async () => {
        render(<Billing />);
        expect(await screen.findByText(/Plan: STARTER/)).toBeInTheDocument();
        expect(screen.getByText(/Subscription ID: sub_test/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open customer portal' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Monthly' })).toHaveLength(3);
        expect(screen.queryByText(/price_/)).not.toBeInTheDocument();
        expect(screen.queryByText(/sk_test/)).not.toBeInTheDocument();
    });
});
