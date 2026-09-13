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
    vendorAPI: { getAll: vi.fn().mockResolvedValue({ data: { vendors: [{ id: 'v1', name: 'Acme' }] } }) },
    tprmAPI: {
        listAssessments: vi.fn().mockResolvedValue({ data: { data: [] } }),
        downloadExecutivePdf: vi.fn(),
        downloadScorecardPdf: vi.fn(),
        downloadAssessmentPdf: vi.fn(),
        downloadFindings: vi.fn(),
        downloadMonitoring: vi.fn(),
        downloadBoard: vi.fn(),
        reportCapabilities: vi.fn().mockResolvedValue({
            data: { data: { isDemo: true, entitled: true, canExportOperational: true, canExportBoard: true } },
        }),
    },
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
        const buttons = await screen.findAllByRole('button', { name: /Download PDF/i });
        await userEvent.click(buttons[0]);
        expect(await screen.findByText(/Downloaded Supreme-Risk-Executive-Report.pdf/)).toBeInTheDocument();
    });

    it('shows error state when generation fails', async () => {
        const { tprmAPI } = await import('../../services/api');
        const { downloadErrorMessage } = await import('../../services/download');
        (tprmAPI.downloadExecutivePdf as any).mockRejectedValue(new Error('generation failed'));
        (downloadErrorMessage as any).mockReturnValue('Report generation failed.');
        renderReports();
        const buttons = await screen.findAllByRole('button', { name: /Download PDF/i });
        await userEvent.click(buttons[0]);
        expect(await screen.findByText(/Report generation failed/)).toBeInTheDocument();
    });

    it('disables vendor scorecard until a vendor is selected', async () => {
        renderReports();
        expect(await screen.findByText(/Select a vendor before generating a scorecard/)).toBeInTheDocument();
    });
});
