import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import IdentityAccess from '../IdentityAccess';

vi.mock('../../services/api', () => ({
    identityAPI: {
        overview: vi.fn(),
        providers: vi.fn(),
        scimTokens: vi.fn(),
        activity: vi.fn(),
        createProvider: vi.fn(),
        updateProvider: vi.fn(),
        discoverOidc: vi.fn(),
        enableProvider: vi.fn(),
        setPolicy: vi.fn(),
        mappings: vi.fn(),
        testProvider: vi.fn(),
        startDomain: vi.fn(),
        verifyDomain: vi.fn(),
        createScimToken: vi.fn(),
        rotateScimToken: vi.fn(),
        revokeScimToken: vi.fn(),
    },
}));

describe('Identity & Access', () => {
    beforeEach(async () => {
        const { identityAPI } = await import('../../services/api');
        (identityAPI.overview as any).mockResolvedValue({
            data: {
                data: {
                    sso: { key: 'not_configured', label: 'Not configured' },
                    protocol: null,
                    domain: { key: 'not_configured', label: 'Not configured' },
                    jit: 'Disabled',
                    scim: { key: 'not_configured', label: 'Not configured' },
                    ssoEnforcement: 'Optional',
                    provisionedUsers: 0,
                    lastSuccessfulSso: null,
                    lastProvisioningActivity: null,
                    recoveryAdministrator: false,
                },
            },
        });
        (identityAPI.providers as any).mockResolvedValue({ data: { data: [] } });
        (identityAPI.scimTokens as any).mockResolvedValue({ data: { data: [] } });
        (identityAPI.activity as any).mockResolvedValue({ data: { data: [] } });
    });

    it('shows truthful not-configured states and no fake connected badge', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/settings/identity']}>
                <IdentityAccess />
            </MemoryRouter>,
        );
        expect(await screen.findByRole('heading', { name: 'Identity & Access' })).toBeInTheDocument();
        expect(screen.getAllByText('Not configured').length).toBeGreaterThan(0);
        expect(screen.queryByText('Connected')).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Single Sign-On' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Provisioning' })).toBeInTheDocument();
    });
});
