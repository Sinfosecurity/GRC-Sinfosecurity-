import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProductDemo from '../ProductDemo';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigate,
    };
});

describe('Product demo tour', () => {
    it('marks the workspace as demo data and showcases the TPRM path', () => {
        render(
            <MemoryRouter>
                <ProductDemo />
            </MemoryRouter>
        );
        expect(screen.getByText('DEMO WORKSPACE')).toBeInTheDocument();
        expect(screen.getByText('NOT PRODUCTION DATA')).toBeInTheDocument();
        for (const title of ['Dashboard', 'Vendors', 'Explainable risk', 'Assessments', 'Evidence', 'Findings', 'Decision brief', 'Reports']) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
        expect(screen.getAllByText(/DEMO DATA:/i).length).toBeGreaterThan(0);
        expect(screen.queryByRole('heading', { name: /Administration/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Switch tenant/i })).not.toBeInTheDocument();
    });

    it('returns to authentication rather than writing data', async () => {
        render(
            <MemoryRouter>
                <ProductDemo />
            </MemoryRouter>
        );
        await userEvent.click(screen.getByRole('button', { name: /Sign in to a real workspace/i }));
        expect(navigate).toHaveBeenCalledWith('/login');
    });
});
