import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import { PageShell, SectionHeader } from '../components/experience/ExperienceKit';
import { color, type } from '../design/tokens';
import { tprmAPI, vendorAPI } from '../services/api';
import EntityRelationships from '../components/EntityRelationships';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';
import { humanizeLabel } from '../utils/humanizeLabel';

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

const decisions = [
    { value: 'APPROVE', label: 'Approve' },
    { value: 'APPROVE_WITH_CONDITIONS', label: 'Approve with conditions' },
    { value: 'ESCALATE', label: 'Request changes' },
    { value: 'REJECT', label: 'Reject' },
    { value: 'RISK_ACCEPTED', label: 'Accept residual risk' },
];

function briefStatus(status?: string) {
    const key = (status || '').toUpperCase();
    if (key === 'DRAFT') return { label: 'Draft', tone: 'neutral' as const };
    if (key === 'DECIDED') return { label: 'Decided', tone: 'success' as const };
    if (key === 'SUPERSEDED') return { label: 'Superseded', tone: 'medium' as const };
    return { label: humanizeLabel(status), tone: 'info' as const };
}

function recordedDecision(value?: string | null) {
    if (!value) return 'Recorded';
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
            await downloadBinaryResponse(response, 'Supreme-Governance-Decision-Brief.pdf');
        } catch (err) {
            setDownloadError(downloadErrorMessage(err));
        } finally {
            setDownloading(false);
        }
    };

    const factors = selected?.immutableSnapshot?.score?.factors || [];
    const vendorName = selected?.immutableSnapshot?.vendor?.name || selected?.vendorId;
    const status = briefStatus(selected?.status);

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Decisions' }]}
                title="Decisions"
                description="What needs a human decision, why it matters, and what you will record. Supreme prepared the record."
                actions={
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: { sm: 220 } }}>
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
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr)' },
                        gap: 2.5,
                        alignItems: 'start',
                    }}
                >
                    <Surface padded={false}>
                        <Box sx={{ px: 2, pt: 2, pb: 1.25, borderBottom: `1px solid ${color.line}` }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkMuted }}>Decision history</Typography>
                        </Box>
                        <Stack spacing={0}>
                            {briefs.map((brief) => {
                                const active = selected?.id === brief.id;
                                const rowStatus = briefStatus(brief.status);
                                return (
                                    <Box
                                        key={brief.id}
                                        component="button"
                                        type="button"
                                        onClick={() => setSelected(brief)}
                                        sx={{
                                            display: 'block',
                                            width: '100%',
                                            textAlign: 'left',
                                            px: 2,
                                            py: 1.5,
                                            border: 0,
                                            borderBottom: `1px solid ${color.line}`,
                                            boxShadow: active ? `inset 3px 0 0 ${color.gold}` : 'none',
                                            bgcolor: active ? color.surfaceMuted : 'transparent',
                                            cursor: 'pointer',
                                            font: 'inherit',
                                            color: 'inherit',
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                                            {brief.immutableSnapshot?.vendor?.name || brief.vendorId}
                                        </Typography>
                                        {brief.engagementName && (
                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>{brief.engagementName}</Typography>
                                        )}
                                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                                            <StatusBadge value={brief.riskBand} kind="severity" />
                                            <StatusBadge kind="plain" tone={rowStatus.tone} label={rowStatus.label} />
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Surface>

                    {selected && (
                        <Stack spacing={2}>
                            <Surface>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'flex-start' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="overline" sx={{ color: color.goldInk }}>Selected decision</Typography>
                                        <Typography variant="h2" sx={{ mt: 0.25 }}>{vendorName}</Typography>
                                        {selected.engagementName && <Typography variant="body2" sx={{ mt: 0.4 }}>{selected.engagementName}</Typography>}
                                        <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 560 }}>
                                            What is being decided, why it needs a person, current residual risk, and the recorded evidence. Scores come from the deterministic engine.
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                                            <StatusBadge kind="plain" tone={status.tone} label={status.label} />
                                            <StatusBadge value={selected.riskBand} kind="severity" />
                                        </Stack>
                                    </Box>
                                    <Button variant="outlined" disabled={downloading} onClick={downloadPdf}>
                                        {downloading ? <CircularProgress size={16} /> : 'Download PDF'}
                                    </Button>
                                </Stack>
                                {downloadError && <Alert severity="error" sx={{ mt: 2 }}>{downloadError}</Alert>}
                            </Surface>

                            <Surface padded={false}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr 1fr', md: '1.2fr 1.2fr 1fr 1fr' },
                                        '& > *': {
                                            px: { xs: 2, md: 2.5 },
                                            py: 2,
                                            borderRight: { md: `1px solid ${color.line}` },
                                            borderBottom: { xs: `1px solid ${color.line}`, md: 'none' },
                                        },
                                        '& > *:nth-of-type(2n)': { borderRight: { xs: 'none', md: `1px solid ${color.line}` } },
                                        '& > *:nth-of-type(n+3)': { borderBottom: { xs: 'none' } },
                                        '& > *:last-child': { borderRight: 0 },
                                    }}
                                >
                                    <DecisionFact label="Inherent risk" value={selected.inherentRisk} />
                                    <DecisionFact
                                        label="Residual risk"
                                        value={selected.residualRisk}
                                        hint={selected.inherentRisk !== selected.residualRisk ? `Inherent ${selected.inherentRisk}` : undefined}
                                    />
                                    <DecisionFact label="Open findings" value={selected.openFindingsCount} />
                                    <DecisionFact label="Monitoring alerts" value={selected.monitoringAlertCount} />
                                </Box>
                            </Surface>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 220px' }, gap: 2 }}>
                                <Surface>
                                    <SectionHeader title="Why this score" body="Persisted factors from the deterministic engine. Supreme does not invent a new explanation." />
                                    {factors.length === 0 ? (
                                        <Typography variant="body2">No persisted factors on this brief.</Typography>
                                    ) : factors.map((factor) => (
                                        <Box key={factor.label} sx={{ py: 1.25, borderBottom: `1px solid ${color.line}` }}>
                                            <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
                                                <Typography sx={{ fontWeight: 700 }}>{factor.label}</Typography>
                                                <Typography className="sr-metric" sx={{ fontFamily: type.mono, fontSize: 15, color: color.ink }}>
                                                    {factor.points >= 0 ? '+' : ''}{factor.points}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" sx={{ mt: 0.4 }}>{factor.rationale}</Typography>
                                        </Box>
                                    ))}
                                </Surface>
                                <Surface>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkMuted }}>Evidence confidence</Typography>
                                    <Typography sx={{ fontFamily: type.display, fontSize: 28, fontWeight: 500, mt: 0.75 }}>{selected.evidenceConfidence}</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.75 }}>Findings and monitoring above are live counts from this tenant.</Typography>
                                </Surface>
                            </Box>

                            <Surface>
                                <SectionHeader title="Recommendation" body="A model summary is interpretation. It is not the score and not the decision." />
                                <Alert severity={selected.aiSummaryStatus === 'SUCCESS' ? 'info' : 'warning'}>
                                    {selected.aiSummaryStatus === 'SUCCESS'
                                        ? (selected.aiSummary || 'A summary is available. AI does not own this score.')
                                        : 'No model summary is available. AI does not own this score.'}
                                </Alert>
                            </Surface>

                            <Surface>
                                <SectionHeader
                                    title={selected.status === 'DRAFT' ? 'Record the decision' : 'What was recorded'}
                                    body={selected.status === 'DRAFT' ? 'The person with authority records the outcome. Historical briefs stay immutable after this.' : 'Historical briefs are immutable.'}
                                />
                                {selected.status === 'DRAFT' ? (
                                    <Box component="form" onSubmit={decide}>
                                        <Stack spacing={2}>
                                            <TextField select label="Decision" value={decision} onChange={(e) => setDecision(e.target.value)}>
                                                {decisions.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                                ))}
                                            </TextField>
                                            <TextField label="Conditions or residual-risk rationale" value={conditions} onChange={(e) => setConditions(e.target.value)} />
                                            <TextField label="Reviewer analysis" multiline minRows={3} value={analysis} onChange={(e) => setAnalysis(e.target.value)} />
                                            <Button type="submit" variant="contained">Record decision</Button>
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Alert severity="success">
                                        Recorded: {recordedDecision(selected.humanDecision)}. Historical briefs are immutable.
                                        {selected.conditions ? ` Conditions: ${selected.conditions}` : ''}
                                    </Alert>
                                )}
                            </Surface>
                            <EntityRelationships sourceModel="RiskDecisionBrief" sourceId={selected.id} />
                        </Stack>
                    )}
                </Box>
            </QueryState>
        </PageShell>
    );
}

function DecisionFact({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <Box>
            <Typography sx={{ fontFamily: type.display, fontSize: 32, lineHeight: 1, fontWeight: 500 }}>{value}</Typography>
            <Typography sx={{ mt: 0.75, fontSize: 13, fontWeight: 700 }}>{label}</Typography>
            {hint && <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>{hint}</Typography>}
        </Box>
    );
}
