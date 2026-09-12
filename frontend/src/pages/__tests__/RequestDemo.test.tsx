import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequestDemo from '../RequestDemo';

const request = vi.fn();

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
    demoAPI: {
        request: (...args: unknown[]) => request(...args),
    },
}));

describe('Request Demo', () => {
    beforeEach(() => {
        request.mockReset();
        request.mockResolvedValue({ data: { delivery: 'NOT_CONFIGURED', accepted: true } });
    });

    it('submits the inquiry fields instead of using a dead CTA', async () => {
        render(
            <MemoryRouter>
                <RequestDemo />
            </MemoryRouter>
        );
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jordan Hale' } });
        fireEvent.change(screen.getByLabelText('Business email'), { target: { value: 'jordan.hale@example.com' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Company' }), { target: { value: 'Harbor Analytics' } });
        fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'CISO' } });
        fireEvent.change(screen.getByLabelText('Company size'), { target: { value: '251–1,000' } });
        fireEvent.change(screen.getByLabelText('Primary need'), { target: { value: 'Third-party risk program' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(request).toHaveBeenCalledWith({
            name: 'Jordan Hale',
            email: 'jordan.hale@example.com',
            company: 'Harbor Analytics',
            role: 'CISO',
            companySize: '251–1,000',
            primaryNeed: 'Third-party risk program',
        });
        expect(await screen.findByRole('status')).toHaveTextContent(/NOT_CONFIGURED/i);
    });
});
