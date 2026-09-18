import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
        expect(await screen.findByText('Inherent risk questions')).toBeInTheDocument();
        expect(screen.getByText(/Acme Payroll/)).toBeInTheDocument();
        expect(screen.getAllByText("Don't know").length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
        expect(screen.getByText(/The vendor will not see this/)).toBeInTheDocument();
    });
});
