import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AiDashboard from '../AiDashboard';

vi.mock('../../services/api', () => ({
    aiGovernanceAPI: { dashboard: vi.fn(), downloadReport: vi.fn(), downloadBoardPptx: vi.fn() },
}));

describe('Supreme AI Governance dashboard', () => {
    beforeEach(async () => {
        const { aiGovernanceAPI } = await import('../../services/api');
        (aiGovernanceAPI.dashboard as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Recorded AI inventory is not an approval, not a legal applicability finding, and not a model-performance claim.',
                    monitoring: 'Manual / Not configured',
                    totals: {
                        activeSystems: 1,
                        productionSystems: 0,
                        highRiskUses: 0,
                        awaitingApproval: 1,
                        incidentsOpen: 0,
                        personalData: 1,
                        withoutOwners: 0,
                        externalVendors: 0,
                    },
                    attention: [{ type: 'Unapproved production AI', why: 'AI-00001 is recorded as PRODUCTION without a current human approval.', publicId: 'AI-00001', href: '/ai-governance/systems/AI-00001' }],
                    changed: [{ title: 'AI system AI-00001 recorded', change: 'Proposed. Not approved.', createdAt: '2026-09-13T12:00:00.000Z' }],
                },
            },
        });
    });

    it('shows honesty language and a live attention queue', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ai-governance']}>
                <AiDashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Supreme AI Governance')).toBeInTheDocument();
        expect(screen.getAllByText(/not an approval/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Manual \/ Not configured/)).toBeInTheDocument();
        expect(screen.getByText(/Unapproved production AI/)).toBeInTheDocument();
        expect(screen.getByText(/AI-00001 is recorded as PRODUCTION/)).toBeInTheDocument();
        expect(screen.queryByText(/AI analysis says/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/EU AI Act High-Risk/i)).not.toBeInTheDocument();
    });
});
