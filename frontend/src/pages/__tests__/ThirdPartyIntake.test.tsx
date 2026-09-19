import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import ThirdPartyIntakeForm from '../ThirdPartyIntakeForm';
import ThirdPartyIntakeQueue from '../ThirdPartyIntakeQueue';
import ThirdPartyMyWork from '../ThirdPartyMyWork';
import ThirdPartyIntakeDetail from '../ThirdPartyIntakeDetail';
import EngagementDetail from '../EngagementDetail';

const intake = {
    id: 'int-1',
    publicId: 'INT-2026-0001',
    proposedThirdPartyName: 'Microsoft Corporation',
    proposedServiceName: 'Azure Hosting',
    requesterName: 'Pat Requester',
    requesterEmail: 'pat@example.test',
    requesterBusinessUnit: 'Product',
    businessPurpose: 'Host a customer-facing application.',
    status: 'UNASSIGNED',
    statusLabel: 'Submitted for GRC review',
    priority: 'HIGH',
    submittedAt: '2026-09-18T12:00:00.000Z',
    nextAction: 'Assign an analyst',
    ageHours: 8,
    overdue: false,
    routingFacts: { connectsToCompanySystems: true },
    assignmentHistory: [],
    informationRequests: [],
    assignedAnalystUserId: null,
};

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u-analyst', firstName: 'Ana', lastName: 'Lyst', email: 'ana@example.test', role: 'ASSESSOR' },
    }),
}));

vi.mock('../../services/api', () => ({
    intakeAPI: {
        create: vi.fn(),
        list: vi.fn(),
        myWork: vi.fn(),
        get: vi.fn(),
        assign: vi.fn(),
        startReview: vi.fn(),
        requestInformation: vi.fn(),
        respondInformation: vi.fn(),
        searchThirdParties: vi.fn(),
        match: vi.fn(),
        createThirdParty: vi.fn(),
        createEngagement: vi.fn(),
        listEngagements: vi.fn(),
        getEngagement: vi.fn(),
        getTierReview: vi.fn(),
        confirmTier: vi.fn(),
        overrideTier: vi.fn(),
        requestIraClarification: vi.fn(),
    },
}));

describe('Wave 1 intake and engagement UI', () => {
    beforeEach(async () => {
        const { intakeAPI } = await import('../../services/api');
        (intakeAPI.create as any).mockResolvedValue({
            data: {
                data: {
                    ...intake,
                    confirmation: {
                        reference: 'INT-2026-0001',
                        proposedThirdParty: 'Microsoft Corporation',
                        service: 'Azure Hosting',
                        currentStatus: 'Submitted for GRC review.',
                    },
                    requesterAcknowledgement: { emailHonestStatus: 'NOT_CONFIGURED' },
                },
            },
        });
        (intakeAPI.list as any).mockResolvedValue({ data: { data: { items: [intake], total: 1, page: 1 } } });
        (intakeAPI.myWork as any).mockResolvedValue({
            data: {
                data: {
                    newAssignments: [{ ...intake, status: 'ASSIGNED', statusLabel: 'Assigned', assignedAnalystUserId: 'u-analyst' }],
                    inReview: [],
                    waitingForRequester: [],
                    readyForVendorMatch: [],
                    overdue: [],
                    analysts: [{ id: 'u-analyst', name: 'Ana Lyst' }],
                    workload: [{ id: 'u-analyst', name: 'Ana Lyst', openCount: 1, overdueCount: 0 }],
                },
            },
        });
        (intakeAPI.get as any).mockResolvedValue({ data: { data: { ...intake, status: 'ASSIGNED', assignedAnalystUserId: 'u-analyst', analysts: [] } } });
        (intakeAPI.getEngagement as any).mockResolvedValue({
            data: {
                data: {
                    id: 'eng-1',
                    publicId: 'ENG-2026-0001',
                    vendorId: 'v1',
                    serviceName: 'Azure Hosting',
                    statusLabel: 'Ready for inherent risk assessment',
                    nextAction: 'Wave 2 will open inherent risk assessment',
                    thirdParty: { name: 'Microsoft Corporation' },
                    requesterName: 'Pat Requester',
                    originatingIntake: { id: 'int-1', publicId: 'INT-2026-0001' },
                },
            },
        });
        (intakeAPI.listEngagements as any).mockResolvedValue({
            data: { data: { items: [{ id: 'eng-1', publicId: 'ENG-2026-0001', serviceName: 'Azure Hosting', statusLabel: 'Ready for inherent risk assessment' }] } },
        });
    });

    it('submits the intake form and shows confirmation', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <ThirdPartyIntakeForm />
            </MemoryRouter>
        );
        expect(screen.getByRole('heading', { name: 'Request a Third Party or Service' })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/Company \/ vendor name/i), { target: { value: 'Microsoft Corporation' } });
        fireEvent.change(screen.getByLabelText(/Product \/ service name/i), { target: { value: 'Azure Hosting' } });
        fireEvent.change(screen.getByLabelText(/What will the service be used for/i), { target: { value: 'Host a customer-facing application.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
        expect(await screen.findByText('Thank you.')).toBeInTheDocument();
        expect(screen.getByText(/INT-2026-0001/)).toBeInTheDocument();
        expect(screen.getByText(/Queued or accepted is not inbox delivery/i)).toBeInTheDocument();
    });

    it('renders the intake queue and empty/error states', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <ThirdPartyIntakeQueue />
            </MemoryRouter>
        );
        expect(await screen.findByText('INT-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
        expect(screen.getByText('TPRM Intake')).toBeInTheDocument();

        const { intakeAPI } = await import('../../services/api');
        (intakeAPI.list as any).mockResolvedValueOnce({ data: { data: { items: [], total: 0, page: 1 } } });
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        expect(await screen.findByText('No intake requests')).toBeInTheDocument();
    });

    it('shows my work buckets and workload', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <ThirdPartyMyWork />
            </MemoryRouter>
        );
        expect(await screen.findByText('New assignments')).toBeInTheDocument();
        expect(screen.getByText('Team workload')).toBeInTheDocument();
        expect(screen.getByText(/Ana Lyst: 1 open/)).toBeInTheDocument();
    });

    it('assigns, starts review, requests information, searches, matches, and creates an engagement', async () => {
        const { intakeAPI } = await import('../../services/api');
        (intakeAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    ...intake,
                    status: 'IN_REVIEW',
                    statusLabel: 'In review',
                    assignedAnalystUserId: 'u-analyst',
                    assignedAnalystName: 'Ana Lyst',
                    nextAction: 'Search third parties or request information',
                },
            },
        });
        (intakeAPI.assign as any).mockResolvedValue({ data: { data: { ...intake, status: 'ASSIGNED', assignmentHistory: [{ id: 'a1', toAnalystName: 'Ana Lyst', assignedByName: 'Lea', assignedAt: '2026-09-18' }] } } });
        (intakeAPI.startReview as any).mockResolvedValue({ data: { data: { ...intake, status: 'IN_REVIEW' } } });
        (intakeAPI.requestInformation as any).mockResolvedValue({ data: { data: { ...intake, status: 'IN_REVIEW', assignedAnalystUserId: 'u-analyst', informationRequests: [{ id: 'i1', requestNote: 'Need purpose', requestedAt: '2026-09-18' }] } } });
        (intakeAPI.searchThirdParties as any).mockResolvedValue({
            data: { data: [{ id: 'v1', name: 'Microsoft Corporation', legalName: 'Microsoft Corporation', domain: 'microsoft.com', country: 'US', engagementCount: 1, status: 'PROPOSED', matchReason: 'Similar name' }] },
        });
        (intakeAPI.match as any).mockResolvedValue({ data: { data: { ...intake, status: 'VENDOR_MATCHED', matchedThirdParty: { name: 'Microsoft Corporation' } } } });
        (intakeAPI.createThirdParty as any).mockResolvedValue({ data: { data: { ...intake, status: 'VENDOR_MATCHED' } } });
        (intakeAPI.createEngagement as any).mockResolvedValue({
            data: { data: { intake: { ...intake, status: 'ENGAGEMENT_CREATED' }, engagement: { publicId: 'ENG-2026-0001' } } },
        });

        render(
            <MemoryRouter future={routerFuture} initialEntries={['/third-parties/intake/int-1']}>
                <Routes>
                    <Route path="/third-parties/intake/:id" element={<ThirdPartyIntakeDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect((await screen.findAllByText(/INT-2026-0001/)).length).toBeGreaterThan(0);
        expect(screen.getByText(/Who requested it: Pat Requester/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit response' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Open requester form' })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('What is missing?'), { target: { value: 'Need the business purpose' } });
        fireEvent.click(screen.getByRole('button', { name: 'Request more information' }));
        await waitFor(() => expect(intakeAPI.requestInformation).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button', { name: 'Search third parties' }));
        expect(await screen.findByText(/Microsoft Corporation · Microsoft Corporation/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm match' }));
        await waitFor(() => expect(intakeAPI.match).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button', { name: 'Create engagement Azure Hosting' }));
        await waitFor(() => expect(intakeAPI.createEngagement).toHaveBeenCalled());
        expect(screen.getByRole('alert')).toHaveTextContent(/Third party confirmed|Engagement created|Information requested/);
    });

    it('shows requester identity and waits for the requester instead of answering as GRC', async () => {
        const { intakeAPI } = await import('../../services/api');
        (intakeAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    ...intake,
                    status: 'NEEDS_INFORMATION',
                    statusLabel: 'Needs information',
                    assignedAnalystUserId: 'u-analyst',
                    assignedAnalystName: 'Ana Lyst',
                    informationRequests: [{ id: 'i1', requestNote: 'Need the region', requestedAt: '2026-09-18' }],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/third-parties/intake/int-1']}>
                <Routes>
                    <Route path="/third-parties/intake/:id" element={<ThirdPartyIntakeDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Who requested it: Pat Requester/)).toBeInTheDocument();
        expect(screen.getByText(/pat@example.test/)).toBeInTheDocument();
        expect(screen.getByText(/Waiting for requester/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit response' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Your response')).not.toBeInTheDocument();
    });

    it('shows engagement detail and sibling engagements', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/third-parties/engagements/eng-1']}>
                <Routes>
                    <Route path="/third-parties/engagements/:id" element={<EngagementDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect((await screen.findAllByText(/ENG-2026-0001 · Azure Hosting/)).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Microsoft Corporation/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Originating intake: INT-2026-0001/)).toBeInTheDocument();
    });

    it('shows an error when the queue fails', async () => {
        const { intakeAPI } = await import('../../services/api');
        (intakeAPI.list as any).mockRejectedValue({ message: 'Queue unavailable' });
        render(
            <MemoryRouter future={routerFuture}>
                <ThirdPartyIntakeQueue />
            </MemoryRouter>
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(/Queue unavailable|Request failed/);
    });
});
