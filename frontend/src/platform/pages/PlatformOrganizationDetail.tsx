import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, HealthChip, Panel } from '../ui';

export default function PlatformOrganizationDetail() {
    const { id } = useParams();
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        if (!id) return;
        setLoading(true);
        platformAPI.organization(id)
            .then((response) => setData(response.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const summary = (data?.summary || {}) as Record<string, unknown>;
    const testingAccess = Boolean(summary.testingAccess || summary.isDemo);
    const billing = (data?.billing || {}) as Record<string, string>;
    const usage = (data?.usage || {}) as Record<string, number>;
    const users = (data?.users || []) as Array<Record<string, string>>;
    const tickets = (data?.support || []) as Array<Record<string, string>>;

    return (
        <QueryState loading={loading} error={error}>
            <Panel title="Summary">
                <Typography sx={{ fontFamily: 'Newsreader, serif', fontSize: 26 }}>{String(summary.name || '')}</Typography>
                <Typography sx={{ color: '#c4b09a' }}>Tenant {String(summary.id || '')}</Typography>
                <HealthChip value={String(summary.health || '')} />
                <Typography sx={{ mt: 1 }}>{String(summary.plan || '')} · {String(summary.status || '')} · {String(summary.subscriptionStatus || 'no subscription recorded')}</Typography>
                <Typography>Evaluation access: {testingAccess ? 'Enabled' : 'Off'}</Typography>
                <Typography>Primary contact: {String(summary.contactName || '—')} {String(summary.contactEmail || '')}</Typography>
                <Button
                    size="small"
                    sx={{ mt: 1.5 }}
                    variant="contained"
                    onClick={() => {
                        if (!id) return;
                        platformAPI.setOrganizationTestingAccess(id, !testingAccess)
                            .then(() => {
                                setNotice(!testingAccess
                                    ? 'Evaluation access enabled. Billing remains test-only.'
                                    : 'Evaluation access revoked.');
                                load();
                            })
                            .catch((err) => setError(err.message));
                    }}
                >
                    {testingAccess ? 'Revoke evaluation access' : 'Enable evaluation access'}
                </Button>
                {notice && <Typography sx={{ mt: 1 }}>{notice}</Typography>}
            </Panel>
            <Panel title="Usage">
                <Typography>Vendors {usage.vendors || 0} · Assessments {usage.assessments || 0} · Evidence {usage.evidenceObjects || 0} · Findings {usage.openFindings || 0} · Decision briefs {usage.decisionBriefs || 0}</Typography>
            </Panel>
            <Panel title="Billing">
                <Typography>Plan {billing.plan} · Interval {billing.interval || '—'} · Status {billing.status || '—'} · Cancel at period end {String(billing.cancelAtPeriodEnd)}</Typography>
                <Typography>Stripe customer {billing.stripeCustomerRef || '—'} · Subscription {billing.stripeSubscriptionRef || '—'}</Typography>
            </Panel>
            <Panel title="Users">
                {users.length === 0 ? <EmptyState>No users recorded for this tenant.</EmptyState> : users.map((user) => (
                    <Typography key={user.id}>{user.firstName} {user.lastName} · {user.email} · {user.role} · {user.status}</Typography>
                ))}
            </Panel>
            <Panel title="Support">
                {tickets.length === 0 ? <EmptyState>No support tickets for this organization.</EmptyState> : tickets.map((ticket) => (
                    <Typography key={ticket.id}>{ticket.displayId} · {ticket.subject} · {ticket.status}</Typography>
                ))}
            </Panel>
        </QueryState>
    );
}
