import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    it('shows the full SCIM origin and human-readable activity without rewriting the raw event', async () => {
        const { identityAPI } = await import('../../services/api');
        (identityAPI.overview as any).mockResolvedValue({
            data: {
                data: {
                    sso: { key: 'configured', label: 'Configured — not verified' },
                    protocol: 'SAML',
                    domain: { key: 'pending', label: 'Pending', value: 'acme.test' },
                    jit: 'Disabled',
                    scim: { key: 'configured', label: 'Token created' },
                    scimBaseUrl: 'https://supreme-risk-staging-api.onrender.com/scim/v2',
                    ssoEnforcement: 'Optional',
                    provisionedUsers: 0,
                    lastSuccessfulSso: null,
                    lastProvisioningActivity: null,
                    recoveryAdministrator: false,
                },
            },
        });
        (identityAPI.providers as any).mockResolvedValue({
            data: {
                data: [{
                    id: 'idp-1',
                    displayName: 'Company SAML',
                    status: { key: 'configured', label: 'Configured — not verified' },
                    saml: {
                        acsUrl: 'https://supreme-risk-staging-api.onrender.com/api/v1/auth/sso/saml/acs/idp_1',
                        spEntityId: 'https://supreme-risk-staging-api.onrender.com/saml/sp/idp_1',
                        metadataUrl: 'https://supreme-risk-staging-api.onrender.com/api/v1/auth/sso/saml/metadata/idp_1',
                    },
                    mappings: [],
                    domains: [{ id: 'd1', domain: 'acme.test', status: 'PENDING' }],
                }],
            },
        });
        (identityAPI.activity as any).mockResolvedValue({
            data: {
                data: [{
                    id: 'evt-1',
                    action: 'identity.provider.created',
                    label: 'Identity provider created',
                    result: 'success',
                    timestamp: '2026-09-18T12:00:00.000Z',
                    actor: 'admin@acme.test',
                }],
            },
        });
        const user = userEvent.setup();
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/settings/identity']}>
                <IdentityAccess />
            </MemoryRouter>,
        );
        expect(await screen.findByText('Configured — not verified')).toBeInTheDocument();
        expect(screen.queryByText('Connected')).not.toBeInTheDocument();
        expect(screen.queryByText('Verified')).not.toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Single Sign-On' }));
        expect(screen.getByDisplayValue('https://supreme-risk-staging-api.onrender.com/api/v1/auth/sso/saml/acs/idp_1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://supreme-risk-staging-api.onrender.com/saml/sp/idp_1')).toBeInTheDocument();
        expect(screen.queryByDisplayValue(/localhost/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Provisioning' }));
        expect(screen.getByDisplayValue('https://supreme-risk-staging-api.onrender.com/scim/v2')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Activity' }));
        expect(screen.getByText(/Identity provider created/)).toBeInTheDocument();
        expect(screen.getByText('identity.provider.created')).toBeInTheDocument();
        expect(screen.getByText(/admin@acme.test/)).toBeInTheDocument();
    });
});
