import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import ComplianceCampaignDetail from '../ComplianceCampaignDetail';

vi.mock('../../services/api', () => ({
    complianceAPI: {
        campaign: vi.fn(),
        reviewAttestation: vi.fn(),
        attest: vi.fn(),
    },
    sccAPI: { controls: vi.fn() },
}));

describe('Attestation campaign review workspace', () => {
    beforeEach(async () => {
        const { complianceAPI, sccAPI } = await import('../../services/api');
        (sccAPI.controls as any).mockResolvedValue({ data: { data: { controls: [] } } });
        (complianceAPI.campaign as any).mockResolvedValue({
            data: {
                data: {
                    publicId: 'CAM-00002',
                    name: 'Hosted Q4 control attestation',
                    framework: 'ISO/IEC 27001 2022-ref',
                    status: 'Overdue',
                    dueAt: '2026-09-01T00:00:00.000Z',
                    submitted: 1,
                    honesty: 'An attestation is a governance statement. Review uses Reviewed or Rejected, not Approved.',
                    queue: [{
                        publicId: 'ATT-00001',
                        control: 'AUTH-01 · MFA',
                        requirement: 'A.15',
                        attestor: 'Report Proof',
                        reviewer: 'Unassigned',
                        attestationStatus: 'Implemented',
                        reviewStatus: 'Pending',
                        filterKey: 'SUBMITTED',
                        submittedAt: '2026-09-10T00:00:00.000Z',
                        dueAt: '2026-09-01T00:00:00.000Z',
                        evidenceCount: 1,
                        evidenceState: 'Evidence available',
                        notes: 'MFA is in use.',
                        overdue: true,
                    }],
                },
            },
        });
    });

    it('renders a review queue with Reviewed/Rejected actions and no Approved label', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/compliance/campaigns/CAM-00002']}>
                <Routes>
                    <Route path="/compliance/campaigns/:publicId" element={<ComplianceCampaignDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect((await screen.findAllByText('Hosted Q4 control attestation')).length).toBeGreaterThan(0);
        expect(screen.getByText('AUTH-01 · MFA')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submitted' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Overdue' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Approved' })).not.toBeInTheDocument();
        expect(screen.getByText(/does not change effectiveness/i)).toBeInTheDocument();
    });
});
