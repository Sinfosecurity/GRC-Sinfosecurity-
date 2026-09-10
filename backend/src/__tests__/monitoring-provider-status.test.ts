import { IntegrationStatus } from '@prisma/client';
import { resolveMonitoringProviderStatus } from '../services/monitoringProviderStatus';

describe('TPRM monitoring provider status', () => {
    it('reports CONNECTED when configured even with zero signals', () => {
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: true,
                dbStatus: IntegrationStatus.CONNECTED,
            })
        ).toBe('CONNECTED');
    });

    it('reports NOT_CONFIGURED when credentials are missing even if historical signals exist', () => {
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: false,
                dbStatus: IntegrationStatus.NOT_CONFIGURED,
            })
        ).toBe('NOT_CONFIGURED');
    });

    it('reports CONNECTED when configured regardless of signal presence', () => {
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: true,
            })
        ).toBe('CONNECTED');
    });

    it('reports ERROR from provider health, not from signal count', () => {
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: true,
                dbStatus: IntegrationStatus.ERROR,
                lastError: 'timeout',
            })
        ).toBe('ERROR');
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: true,
                lastError: 'handshake failed',
            })
        ).toBe('ERROR');
    });

    it('reports DEGRADED when credentials exist but the connection is disconnected', () => {
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: true,
                dbStatus: IntegrationStatus.DISCONNECTED,
            })
        ).toBe('DEGRADED');
    });

    it('reports DISABLED from stored connection state', () => {
        expect(
            resolveMonitoringProviderStatus({
                credentialsConfigured: true,
                dbStatus: IntegrationStatus.DISABLED,
            })
        ).toBe('DISABLED');
    });
});
