import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import RequesterIra from '../RequesterIra';

vi.mock('../../services/api', () => ({
    iraAPI: {
        get: vi.fn().mockResolvedValue({
            data: {
                data: {
                    vendorName: 'Acme Payroll',
                    submitted: false,
                    answers: {},
                    questions: [
                        {
                            key: 'a2',
                            part: 'A',
                            question: 'What information will the vendor store, process, or be able to see?',
                            multiple: true,
                            options: [
                                { value: 'personal', label: 'Personal data about employees or customers' },
                                { value: 'dont_know', label: "Don't know" },
                            ],
                        },
                        {
                            key: 'b1',
                            part: 'B',
                            question: 'If this vendor stopped working tomorrow, what would happen?',
                            options: [
                                { value: 'manage', label: 'Not much — we would manage' },
                                { value: 'dont_know', label: "Don't know" },
                            ],
                        },
                    ],
                },
            },
        }),
        save: vi.fn(),
        submit: vi.fn(),
    },
}));

describe('Requester IRA', () => {
    it('opens the public inherent-risk form without a Supreme login', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ira?token=test-token']}>
                <Routes>
                    <Route path="/ira" element={<RequesterIra />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Business-context risk assessment')).toBeInTheDocument();
        expect(screen.getByText(/Acme Payroll/)).toBeInTheDocument();
        expect(screen.getAllByText("Don't know").length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
        expect(screen.getByText(/The vendor will not see this/)).toBeInTheDocument();
    });

    it('shows the official confirmation after submit and stays read-only', async () => {
        const { iraAPI } = await import('../../services/api');
        (iraAPI.get as any).mockResolvedValueOnce({
            data: {
                data: {
                    vendorName: 'Acme Payroll',
                    submitted: true,
                    readOnly: true,
                    submittedAt: '2026-09-18T15:10:00.000Z',
                    confirmation: 'Your Inherent Risk Assessment has been submitted successfully.',
                    answers: { a2: 'personal' },
                    questions: [
                        {
                            key: 'a2',
                            part: 'A',
                            question: 'What information will the vendor store, process, or be able to see?',
                            multiple: true,
                            options: [{ value: 'personal', label: 'Personal data about employees or customers' }],
                        },
                    ],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ira?token=done']}>
                <Routes>
                    <Route path="/ira" element={<RequesterIra />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Thank you')).toBeInTheDocument();
        expect(screen.getByText(/✓ Submitted/)).toBeInTheDocument();
        expect(screen.getByText(/You may now close this page/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
        expect(screen.queryByText('Business-context risk assessment')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'View submitted responses' }));
        expect(screen.getByText(/Personal data about employees or customers/)).toBeInTheDocument();
    });
});
