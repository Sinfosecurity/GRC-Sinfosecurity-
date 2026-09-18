import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Integrations from '../Integrations';

vi.mock('../../services/api', () => ({
    developerAPI: {
        overview: vi.fn(),
        clients: vi.fn(),
        webhooks: vi.fn(),
        integrations: vi.fn(),
        webhookEvents: vi.fn(),
        activity: vi.fn(),
        createClient: vi.fn(),
        rotateClient: vi.fn(),
        revokeClient: vi.fn(),
        createWebhook: vi.fn(),
        updateWebhook: vi.fn(),
        testWebhook: vi.fn(),
        rotateWebhook: vi.fn(),
        deliveries: vi.fn(),
        retryDelivery: vi.fn(),
        configureIntegration: vi.fn(),
        testIntegration: vi.fn(),
        disableIntegration: vi.fn(),
    },
}));

describe('API & Integrations', () => {
    beforeEach(async () => {
        const { developerAPI } = await import('../../services/api');
        (developerAPI.overview as any).mockResolvedValue({
            data: { data: { clients: 0, webhooks: 0, connectedIntegrations: 0, publicApiBase: '/public/v1', sinkUrl: 'https://supreme-risk-staging-api.onrender.com/public/v1/webhook-sink/abc' } },
        });
        (developerAPI.clients as any).mockResolvedValue({ data: { data: [] } });
        (developerAPI.webhooks as any).mockResolvedValue({ data: { data: [] } });
        (developerAPI.webhookEvents as any).mockResolvedValue({ data: { data: ['third_party.created'] } });
        (developerAPI.activity as any).mockResolvedValue({ data: { data: [] } });
        (developerAPI.integrations as any).mockResolvedValue({
            data: {
                data: [
                    { id: 'slack', label: 'Slack', purpose: 'Notify', configurable: true, comingLater: false, status: { key: 'not_configured', label: 'Not configured' } },
                    { id: 'siem', label: 'SIEM', purpose: 'Coming later', configurable: false, comingLater: true, status: { key: 'not_configured', label: 'Coming later' } },
                ],
            },
        });
    });

    it('shows truthful not-configured states and no fake Connected badge', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/integrations']}>
                <Integrations />
            </MemoryRouter>,
        );
        expect(await screen.findByRole('heading', { name: 'API & Integrations' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'API Clients' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Webhooks' })).toBeInTheDocument();
        expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('shows a created API secret once and Coming later for SIEM', async () => {
        const user = userEvent.setup();
        const { developerAPI } = await import('../../services/api');
        (developerAPI.createClient as any).mockResolvedValue({ data: { data: { token: 'srk_once' } } });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/integrations']}>
                <Integrations />
            </MemoryRouter>,
        );
        await user.click(await screen.findByRole('tab', { name: 'API Clients' }));
        await user.click(screen.getByRole('button', { name: 'Create client' }));
        expect(await screen.findByDisplayValue('srk_once')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Integrations' }));
        expect(screen.getAllByText('Coming later').length).toBeGreaterThan(0);
        expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });
});
