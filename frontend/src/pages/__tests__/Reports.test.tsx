import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Reports from '../Reports';

function renderReports() {
    return render(
        <MemoryRouter future={routerFuture} initialEntries={['/reports']}>
            <Reports />
        </MemoryRouter>
    );
}

vi.mock('../../services/api', () => ({
    vendorAPI: { getAll: vi.fn().mockResolvedValue({ data: { vendors: [{ id: 'v1', name: 'Supreme Investigation' }] } }) },
    tprmAPI: {
        listAssessments: vi.fn().mockResolvedValue({
            data: {
                data: [
                    {
                        id: 'a-completed',
                        vendorId: 'v1',
                        vendor: { id: 'v1', name: 'Supreme Investigation' },
                        assessmentType: 'INITIAL_DUE_DILIGENCE',
                        status: 'COMPLETED',
                        templateName: 'Supreme Risk Standard Due Diligence',
                        templateVersion: '1.0.0',
                        createdAt: '2026-09-13T03:15:46.000Z',
                        completedAt: '2026-09-13T03:18:26.000Z',
                    },
                    {
                        id: 'a-open',
                        vendorId: 'v1',
                        vendor: { id: 'v1', name: 'Supreme Investigation' },
                        assessmentType: 'INITIAL_DUE_DILIGENCE',
                        status: 'IN_PROGRESS',
                        templateName: 'Information Security Assessment',
                        createdAt: '2026-09-13T05:00:58.000Z',
                    },
                ],
            },
        }),
        downloadExecutivePdf: vi.fn(),
        downloadScorecardPdf: vi.fn(),
        downloadAssessmentPdf: vi.fn(),
        downloadFindings: vi.fn(),
        downloadMonitoring: vi.fn(),
        downloadBoard: vi.fn(),
        reportCapabilities: vi.fn().mockResolvedValue({
            data: { data: { testingAccess: true, isDemo: true, entitled: true, canExportOperational: true, canExportBoard: true } },
        }),
    },
    sccAPI: { downloadReport: vi.fn() },
    ermAPI: { downloadReport: vi.fn(), exportRegister: vi.fn() },
}));

vi.mock('../../services/download', () => ({
    downloadBinaryResponse: vi.fn().mockResolvedValue('Supreme-Risk-Executive-Report.pdf'),
    downloadErrorMessage: vi.fn((err: Error) => err.message),
}));

describe('Reports page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('downloads executive PDF and shows success', async () => {
        const { tprmAPI } = await import('../../services/api');
        (tprmAPI.downloadExecutivePdf as any).mockResolvedValue({ data: new Blob(['%PDF']), headers: { 'content-type': 'application/pdf' } });
        renderReports();
        const buttons = await screen.findAllByRole('button', { name: /Generate PDF/i });
        await userEvent.click(buttons[0]);
        expect(await screen.findByText(/Downloaded Supreme-Risk-Executive-Report.pdf/)).toBeInTheDocument();
    });

    it('shows error state when generation fails', async () => {
        const { tprmAPI } = await import('../../services/api');
        const { downloadErrorMessage } = await import('../../services/download');
        (tprmAPI.downloadExecutivePdf as any).mockRejectedValue(new Error('generation failed'));
        (downloadErrorMessage as any).mockReturnValue('Report generation failed.');
        renderReports();
        const buttons = await screen.findAllByRole('button', { name: /Generate PDF/i });
        await userEvent.click(buttons[0]);
        expect(await screen.findByText(/Report generation failed/)).toBeInTheDocument();
    });

    it('disables vendor scorecard until a vendor is selected', async () => {
        renderReports();
        expect(await screen.findByText(/Select a vendor before generating a scorecard/)).toBeInTheDocument();
    });

    it('humanizes assessment types and does not use a flat enum dropdown', async () => {
        const user = userEvent.setup();
        renderReports();
        expect(await screen.findByText(/Select a vendor before generating a scorecard/)).toBeInTheDocument();
        await user.click(screen.getByLabelText('Vendor scope'));
        await user.click(await screen.findByRole('option', { name: 'Supreme Investigation' }));
        expect(await screen.findByTestId('current-assessment')).toHaveTextContent('Initial Due Diligence');
        expect(screen.getByTestId('current-assessment')).toHaveTextContent('Completed');
        expect(screen.getByTestId('assessment-history')).toHaveTextContent('Show other assessments (1)');
        await user.click(screen.getByRole('button', { name: /Show other assessments/ }));
        expect(screen.getByTestId('assessment-history')).toHaveTextContent('Information Security Assessment');
        expect(screen.queryByText('INITIAL_DUE_DILIGENCE')).not.toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: 'Assessment' })).not.toBeInTheDocument();
        expect(screen.getByText(/Assessment report will use Initial Due Diligence/)).toBeInTheDocument();
    });
});
