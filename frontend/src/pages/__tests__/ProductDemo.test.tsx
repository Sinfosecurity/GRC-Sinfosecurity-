import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { routerFuture } from '../../marketing/routerFuture';
import ProductDemo from '../ProductDemo';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
    }),
}));

describe('Product demo tour', () => {
    it('marks the workspace as demo data and showcases the TPRM path', () => {
        render(
            <MemoryRouter future={routerFuture}>
                <ProductDemo />
            </MemoryRouter>
        );
        expect(screen.getByText('DEMO EXPERIENCE')).toBeInTheDocument();
        expect(screen.getByText('DEMO WORKSPACE')).toBeInTheDocument();
        expect(screen.getByText('NOT PRODUCTION DATA')).toBeInTheDocument();
        for (const title of ['Dashboard', 'Third Parties', 'Explainable Risk', 'Assessments', 'Evidence', 'Findings', 'Decision Briefs', 'Reports']) {
            expect(screen.getByRole('tab', { name: title })).toBeInTheDocument();
        }
        expect(screen.getAllByText(/DEMO DATA:/i).length).toBeGreaterThan(0);
        expect(screen.queryByRole('heading', { name: /Administration/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Switch tenant/i })).not.toBeInTheDocument();
    });

    it('returns to authentication rather than writing data', () => {
        render(
            <MemoryRouter future={routerFuture}>
                <ProductDemo />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: /Sign in to a real workspace/i })).toHaveAttribute('href', '/login');
    });

    it('exposes a keyboard-operable tab widget', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter future={routerFuture}>
                <ProductDemo />
            </MemoryRouter>
        );
        const dashboard = screen.getByRole('tab', { name: 'Dashboard' });
        expect(dashboard).toHaveAttribute('aria-selected', 'true');
        expect(dashboard).toHaveAttribute('aria-controls', 'tour-panel-dashboard');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tour-tab-dashboard');
        dashboard.focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Third Parties' })).toHaveAttribute('aria-selected', 'true');
        await user.keyboard('{End}');
        expect(screen.getByRole('tab', { name: 'Reports' })).toHaveAttribute('aria-selected', 'true');
        await user.keyboard('{Home}');
        expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true');
    });
});
