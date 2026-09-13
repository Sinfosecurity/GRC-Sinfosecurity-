import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyImport from '../PrivacyImport';

vi.mock('../../services/api', () => ({
    privacyAPI: { importTemplate: vi.fn(), previewImport: vi.fn(), commitImport: vi.fn() },
}));

describe('Supreme Privacy import workspace', () => {
    it('requires preview before write and names created/updated/skipped/rejected', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/import']}>
                <PrivacyImport />
            </MemoryRouter>
        );
        expect(await screen.findByText(/preview before write/i)).toBeInTheDocument();
        expect(screen.getByText(/download template/i)).toBeInTheDocument();
        expect(screen.getByText(/upload and preview/i)).toBeInTheDocument();
        expect(screen.queryByText(/Confirm import/)).not.toBeInTheDocument();
    });
});
