import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { billingAPI } from '../services/api';
import QueryState from '../components/QueryState';

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
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>Billing</Typography>
            <QueryState loading={loading} error={error} notConfigured={status?.provider === 'NOT_CONFIGURED'}>
                <Card>
                    <CardContent>
                        <Stack spacing={2}>
                            <Typography>Plan: {status?.plan}</Typography>
                            <Typography>Interval: {status?.billingInterval || 'Not set'}</Typography>
                            <Typography>Subscription: {status?.subscriptionStatus || 'Not configured'}</Typography>
                            <Typography>Organization status: {status?.organizationStatus}</Typography>
                            <Typography>Customer: {status?.billingCustomerId || 'None'}</Typography>
                            <Typography>Subscription ID: {status?.billingSubscriptionId || 'None'}</Typography>
                            {status?.cancelAtPeriodEnd && (
                                <Alert severity="info">Cancellation is scheduled at period end. Access stays active until then.</Alert>
                            )}
                            {status?.provider === 'NOT_CONFIGURED' && (
                                <Alert severity="info">Stripe is not configured. Card collection is disabled.</Alert>
                            )}
                            {status?.provider === 'CONNECTED' && (
                                <>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Start or change a test subscription</Typography>
                                    {PLANS.map((plan) => (
                                        <Stack key={plan} direction="row" spacing={1} alignItems="center">
                                            <Typography sx={{ width: 140 }}>{plan}</Typography>
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
                                    <Button
                                        variant="contained"
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
                                </>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            </QueryState>
        </Box>
    );
}
