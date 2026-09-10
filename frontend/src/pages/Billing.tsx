import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { billingAPI } from '../services/api';
import QueryState from '../components/QueryState';

export default function Billing() {
    const [status, setStatus] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        billingAPI.status()
            .then((res) => setStatus(res.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>Billing</Typography>
            <QueryState loading={loading} error={error} notConfigured={status?.provider === 'NOT_CONFIGURED'}>
                <Card>
                    <CardContent>
                        <Stack spacing={2}>
                            <Typography>Plan: {status?.plan}</Typography>
                            <Typography>Subscription: {status?.subscriptionStatus || 'Not configured'}</Typography>
                            <Typography>Organization status: {status?.organizationStatus}</Typography>
                            {status?.provider === 'NOT_CONFIGURED' && (
                                <Alert severity="info">Stripe is not configured. Card collection is disabled.</Alert>
                            )}
                            {status?.provider === 'CONNECTED' && (
                                <Button
                                    variant="contained"
                                    onClick={async () => {
                                        const result = await billingAPI.portal();
                                        if (result.data.data.url) {
                                            window.location.href = result.data.data.url;
                                        }
                                    }}
                                >
                                    Open customer portal
                                </Button>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            </QueryState>
        </Box>
    );
}
