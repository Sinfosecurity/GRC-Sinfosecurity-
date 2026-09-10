import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { aiAPI } from '../services/api';

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

    useEffect(() => {
        aiAPI.status()
            .then((response) => setStatus(response.data.data.status))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const analyze = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        const response = await aiAPI.analyze(feature, context);
        setResult(response.data.data);
    };

    return (
        <Box sx={{ maxWidth: 860 }}>
            <Typography variant="overline" sx={{ color: '#38bdf8', fontWeight: 800, letterSpacing: '0.14em' }}>
                AI Evidence Analyst
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Assist, never own the score</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Output must stay labeled FACTS / INFERENCES / RECOMMENDATIONS. Residual risk still comes from the deterministic engine.
            </Typography>
            <QueryState loading={loading} error={error} notConfigured={status === 'NOT_CONFIGURED'}>
                <Card sx={{ bgcolor: 'rgba(15,23,42,0.85)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <CardContent>
                        <Alert severity="info" sx={{ mb: 2 }}>Provider status: {status}</Alert>
                        <Box component="form" onSubmit={analyze}>
                            <Stack spacing={2}>
                                <TextField select label="Feature" value={feature} onChange={(e) => setFeature(e.target.value)}>
                                    {features.map((item) => (
                                        <MenuItem key={item} value={item}>{item}</MenuItem>
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
                                <Button type="submit" variant="contained">Analyze</Button>
                            </Stack>
                        </Box>
                        {result && (
                            <Alert severity={result.status === 'SUCCESS' ? 'success' : 'warning'} sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                                {result.status}
                                {result.text ? `\n${result.text}` : ' No generated analysis.'}
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </QueryState>
            {status === 'NOT_CONFIGURED' && (
                <Typography sx={{ mt: 2 }} color="text.secondary">
                    Configure OPENAI_API_KEY or AI_API_KEY to enable analysis. Supreme Risk will not invent SOC opinions or evidence.
                </Typography>
            )}
        </Box>
    );
}
