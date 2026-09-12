import { OrganizationStatus } from '@prisma/client';
import { providerHealth } from './providerHealth';

export type CustomerHealth = 'HEALTHY' | 'DEGRADED' | 'ACTION_REQUIRED' | 'INCIDENT' | 'UNKNOWN';

export type HealthSignal = {
    key: string;
    label: string;
    observed: boolean;
    severity: CustomerHealth;
};

export function rollupHealth(signals: HealthSignal[]): { health: CustomerHealth; signals: HealthSignal[] } {
    const observed = signals.filter((signal) => signal.observed);
    if (!observed.length) {
        return { health: 'UNKNOWN', signals };
    }
    if (observed.some((signal) => signal.severity === 'INCIDENT')) {
        return { health: 'INCIDENT', signals };
    }
    if (observed.some((signal) => signal.severity === 'ACTION_REQUIRED')) {
        return { health: 'ACTION_REQUIRED', signals };
    }
    if (observed.some((signal) => signal.severity === 'DEGRADED' || signal.severity === 'UNKNOWN')) {
        return { health: observed.some((signal) => signal.severity === 'DEGRADED') ? 'DEGRADED' : 'UNKNOWN', signals };
    }
    return { health: 'HEALTHY', signals };
}

export async function organizationHealth(input: {
    status: OrganizationStatus | string;
    subscriptionStatus?: string | null;
    openP1: number;
    openP2: number;
    openIncidents: number;
    failedNotifications: number;
    infectedObjects: number;
    failedScans: number;
    pendingScans: number;
    invitationFailures: number;
    lastLoginAt?: Date | null;
    provider?: Awaited<ReturnType<typeof providerHealth>>;
}): Promise<{ health: CustomerHealth; signals: HealthSignal[]; provider: Awaited<ReturnType<typeof providerHealth>> }> {
    const provider = input.provider || (await providerHealth());
    const staleLogin = input.lastLoginAt
        ? Date.now() - input.lastLoginAt.getTime() > 30 * 24 * 60 * 60 * 1000
        : false;
    const signals: HealthSignal[] = [
        {
            key: 'incident',
            label: 'Open platform incident affecting this tenant',
            observed: input.openIncidents > 0,
            severity: 'INCIDENT',
        },
        {
            key: 'p1',
            label: 'Open P1 support case',
            observed: input.openP1 > 0,
            severity: 'ACTION_REQUIRED',
        },
        {
            key: 'p2',
            label: 'Open P2 support case',
            observed: input.openP2 > 0,
            severity: 'ACTION_REQUIRED',
        },
        {
            key: 'billing',
            label: 'Past due or incomplete billing',
            observed: input.status === 'PAST_DUE' || input.subscriptionStatus === 'past_due' || input.subscriptionStatus === 'incomplete',
            severity: 'ACTION_REQUIRED',
        },
        {
            key: 'malware',
            label: 'Infected or failed evidence scan',
            observed: input.infectedObjects > 0 || input.failedScans > 0,
            severity: 'ACTION_REQUIRED',
        },
        {
            key: 'pending_scans',
            label: 'Evidence objects stuck pending',
            observed: input.pendingScans > 0,
            severity: 'DEGRADED',
        },
        {
            key: 'notifications',
            label: 'Failed notifications recorded',
            observed: input.failedNotifications > 0,
            severity: 'DEGRADED',
        },
        {
            key: 'invitations',
            label: 'Invitation delivery failures',
            observed: input.invitationFailures > 0,
            severity: 'DEGRADED',
        },
        {
            key: 'email_provider',
            label: 'Email provider state',
            observed: true,
            severity: provider.email === 'CONNECTED' ? 'HEALTHY' : provider.email === 'NOT_CONFIGURED' ? 'UNKNOWN' : 'DEGRADED',
        },
        {
            key: 'storage',
            label: 'Object storage state',
            observed: true,
            severity: provider.storage === 'CONNECTED' ? 'HEALTHY' : provider.storage === 'NOT_CONFIGURED' ? 'UNKNOWN' : 'DEGRADED',
        },
        {
            key: 'database',
            label: 'Database state',
            observed: true,
            severity: provider.database === 'CONNECTED' ? 'HEALTHY' : 'UNKNOWN',
        },
        {
            key: 'inactivity',
            label: 'No user login for more than 30 days',
            observed: staleLogin || !input.lastLoginAt,
            severity: input.lastLoginAt ? 'DEGRADED' : 'UNKNOWN',
        },
    ];
    return { ...rollupHealth(signals), provider };
}
