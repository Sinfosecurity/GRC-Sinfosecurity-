import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI, vendorAPI } from '../services/api';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';

type Brief = {
    id: string;
    vendorId: string;
    engagementName?: string;
    inherentRisk: number;
    residualRisk: number;
    riskBand: string;
    evidenceConfidence: string;
    openFindingsCount: number;
    monitoringAlertCount: number;
    aiSummary?: string | null;
    aiSummaryStatus: string;
    humanDecision?: string | null;
    conditions?: string | null;
    reviewerAnalysis?: string | null;
    status: string;
    immutableSnapshot?: { vendor?: { name?: string }; score?: { factors?: Array<{ label: string; points: number; rationale: string }> } };
};

const decisions = ['APPROVE', 'APPROVE_WITH_CONDITIONS', 'ESCALATE', 'REJECT', 'RISK_ACCEPTED'];

export default function DecisionBriefs() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [briefs, setBriefs] = useState<Brief[]>([]);
    const [selected, setSelected] = useState<Brief | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [decision, setDecision] = useState('APPROVE');
    const [conditions, setConditions] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [vendorRes, briefRes] = await Promise.all([vendorAPI.getAll(), tprmAPI.listBriefs()]);
            const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
            setVendors(Array.isArray(vendorRows) ? vendorRows : []);
            setBriefs(briefRes.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load decision briefs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const generate = async () => {
        if (!vendorId) return;
        const created = await tprmAPI.generateBrief(vendorId);
        setSelected(created.data.data);
        await load();
    };

    const decide = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        const updated = await tprmAPI.decideBrief(selected.id, {
            decision,
            conditions,
            reviewerAnalysis: analysis,
        });
        setSelected(updated.data.data);
        await load();
    };

    const downloadPdf = async () => {
        if (!selected) return;
        setDownloading(true);
        setDownloadError(null);
        try {
            const response = await tprmAPI.downloadBriefPdf(selected.id);
            await downloadBinaryResponse(response, 'Supreme-Risk-Decision-Brief.pdf');
        } catch (err) {
            setDownloadError(downloadErrorMessage(err));
        } finally {
            setDownloading(false);
        }
    };

    const factors = selected?.immutableSnapshot?.score?.factors || [];

    return (
        <Box sx={{ maxWidth: 1100 }}>
            <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 800, letterSpacing: '0.14em' }}>
                Risk Decision Brief
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Defensible third-party decisions</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Scores come from the deterministic engine. AI summaries are labeled and never replace residual risk.
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 280 }}>
                    <MenuItem value="">Select vendor</MenuItem>
                    {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                        <MenuItem value={vendorId}>Selected vendor</MenuItem>
                    )}
                    {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                    ))}
                </TextField>
                <Button variant="contained" disabled={!vendorId} onClick={generate}>Generate brief</Button>
            </Stack>

            <QueryState loading={loading} error={error} empty={briefs.length === 0 && !selected} emptyTitle="No briefs yet" emptyBody="Generate a brief from a vendor with a persisted explainable score.">
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Card sx={{ flex: 1, bgcolor: 'rgba(15,23,42,0.8)' }}>
                        <CardContent>
                            {briefs.map((brief) => (
                                <Box
                                    key={brief.id}
                                    onClick={() => setSelected(brief)}
                                    sx={{ py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                                >
                                    <Typography fontWeight={700}>{brief.immutableSnapshot?.vendor?.name || brief.vendorId}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Residual {brief.residualRisk} · {brief.riskBand} · {brief.status}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                    {selected && (
                        <Card sx={{ flex: 2, bgcolor: 'rgba(15,23,42,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <CardContent>
                                <Typography variant="h5" sx={{ mb: 1 }}>Why this risk is {selected.riskBand}</Typography>
                                <Button variant="contained" sx={{ mb: 2 }} disabled={downloading} onClick={downloadPdf}>
                                    {downloading ? <CircularProgress size={16} /> : 'Download PDF'}
                                </Button>
                                {downloadError && <Alert severity="error" sx={{ mb: 2 }}>{downloadError}</Alert>}
                                <Typography sx={{ mb: 2 }}>
                                    Inherent {selected.inherentRisk} → residual {selected.residualRisk}. Evidence {selected.evidenceConfidence}. Findings {selected.openFindingsCount}. Monitoring {selected.monitoringAlertCount}.
                                </Typography>
                                {factors.map((factor) => (
                                    <Stack key={factor.label} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                                        <Typography>{factor.label}</Typography>
                                        <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', color: factor.points >= 0 ? '#f87171' : '#34d399' }}>
                                            {factor.points >= 0 ? '+' : ''}{factor.points}
                                        </Typography>
                                    </Stack>
                                ))}
                                <Alert severity={selected.aiSummaryStatus === 'SUCCESS' ? 'info' : 'warning'} sx={{ my: 2 }}>
                                    AI summary: {selected.aiSummaryStatus}
                                    {selected.aiSummary ? ` — ${selected.aiSummary}` : ' No model output. AI does not own this score.'}
                                </Alert>
                                {selected.status === 'DRAFT' ? (
                                    <Box component="form" onSubmit={decide}>
                                        <Stack spacing={2}>
                                            <TextField select label="Human decision" value={decision} onChange={(e) => setDecision(e.target.value)}>
                                                {decisions.map((option) => (
                                                    <MenuItem key={option} value={option}>{option.replace(/_/g, ' ')}</MenuItem>
                                                ))}
                                            </TextField>
                                            <TextField label="Conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} />
                                            <TextField label="Reviewer analysis" multiline minRows={3} value={analysis} onChange={(e) => setAnalysis(e.target.value)} />
                                            <Button type="submit" variant="contained">Record decision</Button>
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Alert severity="success">
                                        Decided: {selected.humanDecision}. Historical briefs are immutable.
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            </QueryState>
        </Box>
    );
}
