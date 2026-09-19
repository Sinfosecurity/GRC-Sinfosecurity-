import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import RequesterLayout from '../RequesterLayout';
import RequesterHome from '../RequesterHome';
import RequesterNewRequest from '../RequesterNewRequest';
import RequesterMyRequests from '../RequesterMyRequests';
import RequesterActions from '../RequesterActions';
import { hasPractitionerWorkspace, hasRequesterWorkspace, participantExperience } from '../workspace';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'u-req',
            firstName: 'Pat',
            lastName: 'Requester',
            email: 'pat@example.test',
            role: 'BUSINESS_OWNER',
            permissions: ['intake.create_own', 'intake.read_own', 'intake.respond_own'],
        },
        logout: vi.fn(),
    }),
}));

vi.mock('../../services/api', () => ({
    requesterAPI: {
        home: vi.fn(),
        list: vi.fn(),
        actions: vi.fn(),
        colleagues: vi.fn(),
        create: vi.fn(),
        get: vi.fn(),
        respond: vi.fn(),
        uploadAttachment: vi.fn(),
        getIra: vi.fn(),
        submitIra: vi.fn(),
        submitIraClarification: vi.fn(),
    },
}));

const { requesterAPI } = await import('../../services/api');

describe('Requester workspace', () => {
    beforeEach(() => {
        vi.mocked(requesterAPI.home).mockResolvedValue({ data: { data: { recent: [], actions: [], counts: { requests: 0, actionsRequired: 0 } } } } as any);
        vi.mocked(requesterAPI.list).mockResolvedValue({ data: { data: { items: [] } } } as any);
        vi.mocked(requesterAPI.actions).mockResolvedValue({ data: { data: { items: [] } } } as any);
        vi.mocked(requesterAPI.colleagues).mockResolvedValue({ data: { data: [] } } as any);
    });

    it('keeps requester navigation free of GRC modules', () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/request']}>
                <Routes>
                    <Route element={<RequesterLayout />}>
                        <Route path="/request" element={<RequesterHome />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByRole('navigation', { name: 'Requester' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'New Request' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Findings' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Assessments' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Intake' })).not.toBeInTheDocument();
        expect(hasRequesterWorkspace(['intake.create_own'], 'BUSINESS_OWNER')).toBe(true);
        expect(hasPractitionerWorkspace(['intake.create_own'])).toBe(false);
        expect(participantExperience('ASSESSOR', ['intake.create_own', 'vendor.read', 'intake.triage'])).toBe('grc');
        expect(hasRequesterWorkspace(['intake.create_own', 'vendor.read'], 'ASSESSOR')).toBe(false);
        expect(hasRequesterWorkspace(['intake.create_own'], 'ORGANIZATION_ADMIN')).toBe(false);
        expect(screen.queryByRole('button', { name: 'Open GRC workspace' })).not.toBeInTheDocument();
    });

    it('prepopulates account identity on the new request form', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <RequesterNewRequest />
            </MemoryRouter>
        );
        expect(screen.getByLabelText('Name')).toHaveValue('Pat Requester');
        expect(screen.getByLabelText('Work email')).toHaveValue('pat@example.test');
        expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    it('shows my requests and action required copy', async () => {
        vi.mocked(requesterAPI.list).mockResolvedValue({
            data: { data: { items: [{ id: '1', publicId: 'INT-2026-0004', proposedThirdPartyName: 'Microsoft Corporation', proposedServiceName: 'Azure Hosting', requesterStatus: 'Submitted', submittedAt: '2026-09-19T00:00:00.000Z' }] } },
        } as any);
        vi.mocked(requesterAPI.actions).mockResolvedValue({
            data: { data: { items: [{ id: 'a1', publicId: 'INT-2026-0005', proposedThirdPartyName: 'Contoso', proposedServiceName: 'Analytics', requestNote: 'Need a real purpose', requestedAt: '2026-09-19T00:00:00.000Z' }] } },
        } as any);
        render(
            <MemoryRouter future={routerFuture}>
                <RequesterMyRequests />
                <RequesterActions />
            </MemoryRouter>
        );
        expect(await screen.findByText(/INT-2026-0004/)).toBeInTheDocument();
        expect(await screen.findByText(/Need a real purpose/)).toBeInTheDocument();
        expect(screen.getByText(/Supporting documents/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Your response'), { target: { value: 'Customer analytics' } });
        vi.mocked(requesterAPI.respond).mockResolvedValue({ data: { data: { requesterStatus: 'Under review' } } } as any);
        fireEvent.click(screen.getByRole('button', { name: 'Send response' }));
        await waitFor(() => expect(requesterAPI.respond).toHaveBeenCalled());
    });

    it('stays in requester workspace after submit confirmation', async () => {
        vi.mocked(requesterAPI.create).mockResolvedValue({
            data: {
                data: {
                    publicId: 'INT-2026-0007',
                    proposedThirdPartyName: 'Microsoft Corporation',
                    proposedServiceName: 'Azure Hosting',
                    requesterStatus: 'Submitted',
                    submittedAt: '2026-09-19T00:00:00.000Z',
                },
            },
        } as any);
        const { container } = render(
            <MemoryRouter future={routerFuture}>
                <RequesterNewRequest />
            </MemoryRouter>
        );
        const form = () => container.querySelector('form') as HTMLFormElement;
        fireEvent.submit(form());
        fireEvent.change(await screen.findByLabelText('Company / vendor name'), { target: { value: 'Microsoft Corporation' } });
        fireEvent.change(screen.getByLabelText('Product / service name'), { target: { value: 'Azure Hosting' } });
        fireEvent.submit(form());
        fireEvent.change(await screen.findByLabelText('What will the service be used for?'), { target: { value: 'Host a customer-facing application.' } });
        fireEvent.submit(form());
        expect(await screen.findByText(/These help GRC route/)).toBeInTheDocument();
        fireEvent.submit(form());
        expect(await screen.findByText(/Requested by:/)).toBeInTheDocument();
        fireEvent.submit(form());
        expect(await screen.findByText('Thank you')).toBeInTheDocument();
        expect(screen.getByText(/INT-2026-0007/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View request' })).toBeInTheDocument();
        expect(screen.queryByText('Intake Queue')).not.toBeInTheDocument();
    });
});
