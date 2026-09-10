import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI } from '../services/api';

type Signal = {
    id: string;
    monitoringType: string;
    riskIndicator: string;
    riskLevel: string;
    requiresAction: boolean;
    detectedAt: string;
    vendor?: { name: string };
};

export default function ContinuousMonitoring() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [providerStatus, setProviderStatus] = useState('NOT_CONFIGURED');
    const [signalCount, setSignalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        tprmAPI.monitoringSignals()
            .then((response) => {
                setSignals(response.data.data.signals || []);
                setProviderStatus(response.data.data.providerStatus || 'NOT_CONFIGURED');
                setSignalCount(response.data.data.signalCount ?? response.data.data.signals?.length ?? 0);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box sx={{ maxWidth: 1000 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Continuous monitoring</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                Only recorded vendor signals are shown. External rating feeds are not simulated.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Chip label={`Provider ${providerStatus}`} />
                <Chip label={`Signals ${signalCount}`} variant="outlined" />
            </Stack>
            <QueryState
                loading={loading}
                error={error}
                empty={signals.length === 0}
                emptyTitle="No monitoring signals"
                emptyBody="When a connected provider records a vendor signal, it will appear here and can raise findings."
            >
                <Stack spacing={1.5}>
                    {signals.map((signal) => (
                        <Card key={signal.id} sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                            <CardContent>
                                <Typography fontWeight={700}>{signal.vendor?.name || 'Vendor'}</Typography>
                                <Typography color="text.secondary">
                                    {signal.monitoringType}: {signal.riskIndicator}
                                </Typography>
                                <Chip size="small" label={signal.riskLevel} sx={{ mt: 1 }} />
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </QueryState>
        </Box>
    );
}
