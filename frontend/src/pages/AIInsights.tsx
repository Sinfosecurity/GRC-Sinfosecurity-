import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import StatusBadge from '../components/design/StatusBadge';
import { aiAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

const features = [
    'evidence_summary',
    'vendor_summary',
    'weak_controls',
    'contract_analysis',
    'finding_draft',
    'remediation',
    'executive_summary',
];

export default function AIInsights() {
    const [status, setStatus] = useState<string>('NOT_CONFIGURED');
    const [feature, setFeature] = useState('evidence_summary');
    const [context, setContext] = useState('');
    const [result, setResult] = useState<{ status: string; text?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        aiAPI.status()
            .then((response) => setStatus(response.data.data.status))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const analyze = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const response = await aiAPI.analyze(feature, context);
            setResult(response.data.data);
        } catch (err: any) {
            setError(err.message || 'Analysis failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 880 }}>
            <PageHeader
                crumbs={[{ label: 'Intelligence' }, { label: 'AI Analyst' }]}
                title="AI analyst"
                description="Assistance stays labeled as facts, inferences, and recommendations. Residual risk still comes from the deterministic engine."
                meta={!loading ? (
                    <StatusBadge
                        kind="plain"
                        tone={status === 'NOT_CONFIGURED' ? 'medium' : status === 'ERROR' ? 'high' : 'success'}
                        label={humanizeLabel(status)}
                    />
                ) : undefined}
            />
            {!loading && (
                <Alert severity={status === 'NOT_CONFIGURED' ? 'info' : status === 'ERROR' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {status === 'NOT_CONFIGURED'
                        ? 'AI assistance is not configured for this environment. Supreme will not invent analysis.'
                        : `Provider status: ${status}`}
                </Alert>
            )}
            <QueryState loading={loading} error={error} notConfigured={status === 'NOT_CONFIGURED'}>
                <Surface>
                    <Box component="form" onSubmit={analyze}>
                        <Stack spacing={2}>
                            <TextField select label="Feature" value={feature} onChange={(e) => setFeature(e.target.value)}>
                                {features.map((item) => (
                                    <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Evidence or vendor context"
                                multiline
                                minRows={6}
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                required
                            />
                            <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Analyzing…' : 'Analyze'}</Button>
                        </Stack>
                    </Box>
                    {result && (
                        <Alert severity={result.status === 'SUCCESS' ? 'success' : 'warning'} sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                            {result.status}
                            {result.text ? `\n${result.text}` : ' No generated analysis.'}
                        </Alert>
                    )}
                </Surface>
            </QueryState>
            {status === 'NOT_CONFIGURED' && (
                <Typography sx={{ mt: 2 }} color="text.secondary">
                    Configure OPENAI_API_KEY or AI_API_KEY to enable analysis. Supreme Risk will not invent SOC opinions or evidence.
                </Typography>
            )}
        </Box>
    );
}
