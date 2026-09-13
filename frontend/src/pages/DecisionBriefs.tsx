import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import MetricCard from '../components/design/MetricCard';
import Surface from '../components/design/Surface';
import { color } from '../design/tokens';
import { tprmAPI, vendorAPI } from '../services/api';
import EntityRelationships from '../components/EntityRelationships';
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
            const rows = Array.isArray(briefRes.data.data) ? briefRes.data.data : [];
            setBriefs(rows);
            setSelected((current) => current || rows[0] || null);
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
    const vendorName = selected?.immutableSnapshot?.vendor?.name || selected?.vendorId;

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Decisions' }]}
                title="Decision workspace"
                description="Record a defensible human decision against explainable residual risk. AI may summarize; it never owns the score."
                actions={
                    <Stack direction="row" spacing={1}>
                        <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 220 }}>
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
                }
            />

            <QueryState loading={loading} error={error} empty={briefs.length === 0 && !selected} emptyTitle="No decisions yet" emptyBody="Generate a brief from a vendor with a persisted explainable score. The brief becomes the record for approval or rejection.">
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
                    <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
                        <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>Briefs</Typography>
                        <Stack spacing={0.75}>
                            {briefs.map((brief) => {
                                const active = selected?.id === brief.id;
                                return (
                                    <Box
                                        key={brief.id}
                                        onClick={() => setSelected(brief)}
                                        sx={{
                                            p: 1.5,
                                            cursor: 'pointer',
                                            border: `1px solid ${active ? color.gold : color.line}`,
                                            bgcolor: color.surface,
                                            borderRadius: '6px',
                                        }}
                                    >
                                        <Typography variant="subtitle2">{brief.immutableSnapshot?.vendor?.name || brief.vendorId}</Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                            <StatusBadge value={brief.riskBand} kind="severity" />
                                            <StatusBadge value={brief.status} kind="plain" tone={brief.status === 'DRAFT' ? 'high' : 'success'} />
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>

                    {selected && (
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="overline">Residual risk decision</Typography>
                                    <Typography variant="h3">{vendorName}</Typography>
                                    <Typography variant="body2">Why this engagement is {selected.riskBand}. Scores come from the deterministic engine.</Typography>
                                </Box>
                                <Button variant="outlined" disabled={downloading} onClick={downloadPdf}>
                                    {downloading ? <CircularProgress size={16} /> : 'Download PDF'}
                                </Button>
                            </Stack>
                            {downloadError && <Alert severity="error" sx={{ mb: 2 }}>{downloadError}</Alert>}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                                <MetricCard label="Inherent" value={selected.inherentRisk} />
                                <MetricCard label="Residual" value={selected.residualRisk} />
                                <MetricCard label="Open findings" value={selected.openFindingsCount} />
                                <MetricCard label="Monitoring alerts" value={selected.monitoringAlertCount} />
                            </Stack>
                            <Stack spacing={2}>
                                <Surface>
                                    <Typography variant="h5" sx={{ mb: 1 }}>Evidence confidence</Typography>
                                    <Typography variant="body2">{selected.evidenceConfidence}. Findings and monitoring above are live counts from this tenant.</Typography>
                                </Surface>
                                <Surface>
                                    <Typography variant="h5" sx={{ mb: 1 }}>Score factors</Typography>
                                    {factors.length === 0 ? (
                                        <Typography variant="body2">No persisted factors on this brief.</Typography>
                                    ) : factors.map((factor) => (
                                        <Stack key={factor.label} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: `1px solid ${color.line}` }}>
                                            <Box>
                                                <Typography variant="subtitle2">{factor.label}</Typography>
                                                <Typography variant="caption">{factor.rationale}</Typography>
                                            </Box>
                                            <Typography className="sr-metric" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                                                {factor.points >= 0 ? '+' : ''}{factor.points}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Surface>
                                <Surface>
                                    <Typography variant="h5" sx={{ mb: 1 }}>Recommendation</Typography>
                                    <Alert severity={selected.aiSummaryStatus === 'SUCCESS' ? 'info' : 'warning'}>
                                        AI summary status: {selected.aiSummaryStatus}.
                                        {selected.aiSummary ? ` ${selected.aiSummary}` : ' No model output. AI does not own this score.'}
                                    </Alert>
                                </Surface>
                                <Surface>
                                    <Typography variant="h5" sx={{ mb: 1.5 }}>Human decision</Typography>
                                    {selected.status === 'DRAFT' ? (
                                        <Box component="form" onSubmit={decide}>
                                            <Stack spacing={2}>
                                                <TextField select label="Decision" value={decision} onChange={(e) => setDecision(e.target.value)}>
                                                    {decisions.map((option) => (
                                                        <MenuItem key={option} value={option}>{option.replace(/_/g, ' ')}</MenuItem>
                                                    ))}
                                                </TextField>
                                                <TextField label="Conditions or residual-risk rationale" value={conditions} onChange={(e) => setConditions(e.target.value)} />
                                                <TextField label="Reviewer analysis" multiline minRows={3} value={analysis} onChange={(e) => setAnalysis(e.target.value)} />
                                                <Button type="submit" variant="contained">Record decision</Button>
                                            </Stack>
                                        </Box>
                                    ) : (
                                        <Alert severity="success">
                                            Recorded: {selected.humanDecision}. Historical briefs are immutable.
                                            {selected.conditions ? ` Conditions: ${selected.conditions}` : ''}
                                        </Alert>
                                    )}
                                </Surface>
                                <EntityRelationships sourceModel="RiskDecisionBrief" sourceId={selected.id} />
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </QueryState>
        </Box>
    );
}
