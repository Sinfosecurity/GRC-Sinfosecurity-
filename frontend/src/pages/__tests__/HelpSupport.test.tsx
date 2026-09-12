import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import HelpSupport from '../HelpSupport';

const create = vi.fn().mockResolvedValue({ data: { data: { id: 't1' } } });
const list = vi.fn().mockResolvedValue({ data: { data: [] } });

vi.mock('../../platform/api', () => ({
    tenantSupportAPI: {
        create: (...args: unknown[]) => create(...args),
        list: () => list(),
        get: vi.fn(),
        reply: vi.fn(),
    },
}));

describe('Help & Support', () => {
    it('uses request language without a 24/7 claim', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <HelpSupport />
            </MemoryRouter>
        );
        expect(screen.getByRole('button', { name: 'Submit a support request' })).toBeInTheDocument();
        expect(screen.queryByText(/24\/7/i)).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Export stuck' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Board report never finishes.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit a support request' }));
        expect(create).toHaveBeenCalled();
    });
});
