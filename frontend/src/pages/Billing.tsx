import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { billingAPI } from '../services/api';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import FactList from '../components/design/FactList';
import StatusBadge from '../components/design/StatusBadge';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import { humanizeLabel } from '../utils/humanizeLabel';

const PLANS = ['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'] as const;
const INTERVALS = [
    { id: 'month', label: 'Monthly' },
    { id: 'year', label: 'Annual' },
] as const;

export default function Billing() {
    const [status, setStatus] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        billingAPI.status()
            .then((res) => setStatus(res.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    async function startCheckout(plan: string, interval: string) {
        setBusy(true);
        setError(null);
        try {
            const result = await billingAPI.checkout(plan, interval);
            const url = result.data.data.url;
            if (!url) {
                setError(result.data.data.reason || 'Checkout is not available');
                return;
            }
            window.location.href = url;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <WorkspaceFrame purpose="admin">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Billing' }]}
                title="Billing"
                description="Private testing uses Stripe test mode only, if billing is configured. A successful test checkout is not a commercial purchase."
                meta={status?.subscriptionStatus ? (
                    <StatusBadge
                        kind="plain"
                        tone={status.subscriptionStatus === 'active' ? 'success' : 'medium'}
                        label={humanizeLabel(status.subscriptionStatus)}
                    />
                ) : undefined}
            />
            <Alert severity="info" sx={{ mb: 3 }}>
                Private testing uses Stripe test mode only, if billing is configured. Do not enter a real production card. A successful test checkout is not a commercial purchase.
            </Alert>
            <QueryState loading={loading} error={error} notConfigured={status?.provider === 'NOT_CONFIGURED'}>
                <Surface>
                    <Typography variant="overline">Subscription</Typography>
                    <FactList
                        items={[
                            { label: 'Plan', value: `Plan: ${status?.plan}` },
                            { label: 'Interval', value: `Interval: ${status?.billingInterval || 'Not set'}` },
                            { label: 'Subscription', value: `Subscription: ${status?.subscriptionStatus || 'Not configured'}` },
                            { label: 'Organization status', value: `Organization status: ${status?.organizationStatus}` },
                        ]}
                    />
                    {status?.cancelAtPeriodEnd && (
                        <Alert severity="info" sx={{ mt: 2 }}>Cancellation is scheduled at period end. Access stays active until then.</Alert>
                    )}
                    {status?.provider === 'NOT_CONFIGURED' && (
                        <Alert severity="info" sx={{ mt: 2 }}>Stripe is not configured. Card collection is disabled.</Alert>
                    )}
                    <Box component="details" sx={{ mt: 2 }}>
                        <Typography component="summary" variant="body2" sx={{ cursor: 'pointer', fontWeight: 650 }}>
                            Technical identifiers
                        </Typography>
                        <FactList
                            columns={1}
                            items={[
                                { label: 'Customer', value: `Customer: ${status?.billingCustomerId || 'None'}` },
                                { label: 'Subscription ID', value: `Subscription ID: ${status?.billingSubscriptionId || 'None'}` },
                            ]}
                        />
                    </Box>
                    {status?.provider === 'CONNECTED' && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Start or change a test subscription</Typography>
                            <Stack spacing={1.25}>
                                {PLANS.map((plan) => (
                                    <Stack key={plan} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                                        <Typography sx={{ width: { sm: 140 }, fontWeight: 650 }}>{plan}</Typography>
                                        {INTERVALS.map((interval) => (
                                            <Button
                                                key={`${plan}-${interval.id}`}
                                                variant="outlined"
                                                disabled={busy}
                                                onClick={() => startCheckout(plan, interval.id)}
                                            >
                                                {interval.label}
                                            </Button>
                                        ))}
                                    </Stack>
                                ))}
                            </Stack>
                            <Button
                                variant="contained"
                                sx={{ mt: 2 }}
                                disabled={busy || !status?.billingCustomerId}
                                onClick={async () => {
                                    const result = await billingAPI.portal();
                                    if (result.data.data.url) {
                                        window.location.href = result.data.data.url;
                                    }
                                }}
                            >
                                Open customer portal
                            </Button>
                        </Box>
                    )}
                </Surface>
            </QueryState>
        </WorkspaceFrame>
    );
}
