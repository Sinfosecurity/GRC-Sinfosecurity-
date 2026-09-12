import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import RequestDemo from '../RequestDemo';
import { ApiClientError } from '../../services/api';

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

vi.mock('../../services/api', async () => {
    const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
    return {
        ...actual,
        demoAPI: {
            request: (...args: unknown[]) => request(...args),
        },
    };
});

function fillForm() {
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jordan Hale' } });
    fireEvent.change(screen.getByLabelText('Business email'), { target: { value: 'jordan.hale@example.com' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Company' }), { target: { value: 'Harbor Analytics' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'CISO' } });
    fireEvent.change(screen.getByLabelText('Company size'), { target: { value: '251–1,000' } });
    fireEvent.change(screen.getByLabelText('Primary need'), { target: { value: 'Third-party risk program' } });
}

function renderDemo(path = '/request-demo') {
    return render(
        <MemoryRouter future={routerFuture} initialEntries={[path]}>
            <RequestDemo />
        </MemoryRouter>
    );
}

describe('Request Demo', () => {
    beforeEach(() => {
        request.mockReset();
        request.mockResolvedValue({ data: { accepted: true, requestId: 'req-1' } });
    });

    it('shows a polished request-received state and never renders delivery internals', async () => {
        renderDemo();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(request).toHaveBeenCalledWith({
            name: 'Jordan Hale',
            email: 'jordan.hale@example.com',
            company: 'Harbor Analytics',
            role: 'CISO',
            companySize: '251–1,000',
            primaryNeed: 'Third-party risk program',
            intent: 'demo',
        });
        expect(await screen.findByRole('heading', { name: /request has been received/i })).toBeInTheDocument();
        expect(screen.getByText(/A member of the Supreme team will review/i)).toBeInTheDocument();
        expect(screen.queryByText(/NOT_CONFIGURED/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/FAILED/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/SENDGRID|RESEND|SMTP|deliveryStatus/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit request' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Return to home' })).toBeInTheDocument();
    });

    it('blocks a second click while the first request is in flight', async () => {
        let release!: (value: unknown) => void;
        request.mockReturnValue(new Promise((resolve) => {
            release = resolve;
        }));
        renderDemo();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Submitting…' }));
        expect(request).toHaveBeenCalledTimes(1);
        release({ data: { accepted: true } });
        expect(await screen.findByRole('heading', { name: /request has been received/i })).toBeInTheDocument();
    });

    it('keeps form values and shows a customer-safe 429 message', async () => {
        request.mockRejectedValue(new ApiClientError('Too many requests. Please try again later.', 429, 'RATE_LIMITED'));
        renderDemo();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests have been submitted. Please wait a little while and try again.');
        expect(screen.getByLabelText('Name')).toHaveValue('Jordan Hale');
        expect(screen.getByLabelText('Business email')).toHaveValue('jordan.hale@example.com');
        expect(screen.queryByText(/RATE_LIMIT|Redis|limiter/i)).not.toBeInTheDocument();
    });

    it('shows field-level validation errors', async () => {
        request.mockRejectedValue(new ApiClientError(
            'Please correct the highlighted fields.',
            400,
            'VALIDATION',
            [{ field: 'email', message: 'Enter a valid business email.' }]
        ));
        renderDemo();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(await screen.findByText('Enter a valid business email.')).toBeInTheDocument();
        expect(screen.getByLabelText('Name')).toHaveValue('Jordan Hale');
    });

    it('shows a customer-safe persistence failure', async () => {
        request.mockRejectedValue(new ApiClientError('disk full', 500));
        renderDemo();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't submit your request right now. Please try again.");
    });

    it('preserves pricing source and selected plan on enterprise sales', async () => {
        renderDemo('/request-demo?source=pricing&selectedPlan=ENTERPRISE&intent=enterprise-sales');
        expect(screen.getByRole('heading', { name: /Contact sales about the ENTERPRISE plan/i })).toBeInTheDocument();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Contact sales' }));
        expect(await screen.findByRole('heading', { name: /request has been received/i })).toBeInTheDocument();
        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            intent: 'enterprise-sales',
            plan: 'ENTERPRISE',
            selectedPlan: 'ENTERPRISE',
            source: 'pricing',
        }));
    });
});
