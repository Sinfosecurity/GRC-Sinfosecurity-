import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import { DecisionRiskStrip, EvidenceHealth } from '../components/design/DecisionSummary';
import { PageShell, SectionHeader } from '../components/experience/ExperienceKit';
import { color, type } from '../design/tokens';
import { tprmAPI, vendorAPI } from '../services/api';
import EntityRelationships from '../components/EntityRelationships';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';
import { humanizeLabel } from '../utils/humanizeLabel';

export type Brief = {
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
    createdAt?: string;
    decidedAt?: string | null;
    immutableSnapshot?: { vendor?: { name?: string }; score?: { factors?: Array<{ label: string; points: number; rationale: string }> } };
};

const decisions = [
    { value: 'APPROVE', label: 'Approve' },
    { value: 'APPROVE_WITH_CONDITIONS', label: 'Approve with conditions' },
    { value: 'ESCALATE', label: 'Request changes' },
    { value: 'REJECT', label: 'Reject' },
    { value: 'RISK_ACCEPTED', label: 'Accept residual risk' },
];

export function resolveSelectedBrief(rows: Brief[], preferredId?: string | null): Brief | null {
    if (preferredId) {
        const match = rows.find((row) => row.id === preferredId);
        if (match) return match;
    }
    return rows[0] || null;
}

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

function briefDate(brief: Brief) {
    const raw = brief.decidedAt || brief.createdAt;
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
}

function vendorLabel(brief: Brief) {
    return brief.immutableSnapshot?.vendor?.name || brief.vendorId;
}

export default function DecisionBriefs() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [briefs, setBriefs] = useState<Brief[]>([]);
    const [selected, setSelected] = useState<Brief | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [decision, setDecision] = useState('APPROVE');
    const [conditions, setConditions] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [deciding, setDeciding] = useState(false);

    const load = async (preferredId?: string | null) => {
        setLoading(true);
        setError(null);
        try {
            const [vendorRes, briefRes] = await Promise.all([vendorAPI.getAll(), tprmAPI.listBriefs()]);
            const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
            setVendors(Array.isArray(vendorRows) ? vendorRows : []);
            const rows = Array.isArray(briefRes.data.data) ? briefRes.data.data : [];
            setBriefs(rows);
            setSelected((current) => resolveSelectedBrief(rows, preferredId ?? current?.id));
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
        if (!vendorId || generating || deciding) return;
        setGenerating(true);
        setActionError(null);
        try {
            const created = await tprmAPI.generateBrief(vendorId);
            const createdId = created.data.data?.id;
            await load(createdId);
        } catch (err: any) {
            setActionError(err.message || 'Unable to generate a brief');
        } finally {
            setGenerating(false);
        }
    };

    const decide = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || generating || deciding) return;
        setDeciding(true);
        setActionError(null);
        try {
            const updated = await tprmAPI.decideBrief(selected.id, {
                decision,
                conditions,
                reviewerAnalysis: analysis,
            });
            await load(updated.data.data?.id || selected.id);
        } catch (err: any) {
            setActionError(err.message || 'Unable to record this decision');
        } finally {
            setDeciding(false);
        }
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
    const vendorName = selected ? vendorLabel(selected) : '';
    const status = briefStatus(selected?.status);
    const busy = generating || deciding || downloading;
    const selectedVendorName = vendors.find((vendor) => vendor.id === vendorId)?.name;

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Decisions' }]}
                title="Decisions"
                description="What needs a human decision, why the residual risk sits here, and what will be recorded."
                meta={selected && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <StatusBadge kind="plain" tone={status.tone} label={status.label} />
                        <StatusBadge value={selected.riskBand} kind="severity" />
                        {selected.humanDecision && (
                            <StatusBadge kind="plain" tone="info" label={recordedDecision(selected.humanDecision)} />
                        )}
                    </Stack>
                )}
                actions={
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }} alignItems={{ sm: 'center' }}>
                        <TextField
                            select
                            size="small"
                            label="Vendor"
                            value={vendorId}
                            onChange={(e) => setVendorId(e.target.value)}
                            sx={{ minWidth: { sm: 200 }, maxWidth: { sm: 260 } }}
                            disabled={generating}
                        >
                            <MenuItem value="">Select vendor</MenuItem>
                            {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                                <MenuItem value={vendorId}>Selected vendor</MenuItem>
                            )}
                            {vendors.map((vendor) => (
                                <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="contained"
                            disabled={!vendorId || busy}
                            onClick={generate}
                            aria-busy={generating || undefined}
                        >
                            {generating ? 'Generating…' : 'Generate brief'}
                        </Button>
                    </Stack>
                }
            />
            {actionError && <Alert severity="error" sx={{ mb: 2 }} role="alert">{actionError}</Alert>}
            {selectedVendorName && (
                <Typography variant="body2" sx={{ mb: 1.5, color: color.inkMuted }}>
                    Briefs will be generated for {selectedVendorName}.
                </Typography>
            )}

            <QueryState loading={loading} error={error} empty={briefs.length === 0 && !selected} emptyTitle="No decisions yet" emptyBody="Generate a brief from a vendor with a persisted explainable score. The brief becomes the record for approval or rejection.">
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr', lg: '300px minmax(0, 1fr)' },
                        gap: 2.5,
                        alignItems: 'start',
                    }}
                >
                    <Surface padded={false}>
                        <Box sx={{ px: 2, pt: 2, pb: 1.25, borderBottom: `1px solid ${color.line}` }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkMuted }}>
                                Decision history
                            </Typography>
                        </Box>
                        <Box
                            component="nav"
                            aria-label="Decision history"
                            sx={{ maxHeight: { lg: 'calc(100vh - 220px)' }, overflowY: 'auto' }}
                        >
                            <Stack spacing={0}>
                                {briefs.map((brief) => {
                                    const active = selected?.id === brief.id;
                                    const rowStatus = briefStatus(brief.status);
                                    const date = briefDate(brief);
                                    const name = vendorLabel(brief);
                                    return (
                                        <Box
                                            key={brief.id}
                                            component="button"
                                            type="button"
                                            aria-current={active ? 'true' : undefined}
                                            aria-label={`${name}, residual ${brief.residualRisk}, ${rowStatus.label}${brief.humanDecision ? `, ${recordedDecision(brief.humanDecision)}` : ''}`}
                                            onClick={() => setSelected(brief)}
                                            sx={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                px: 2,
                                                py: 1.35,
                                                border: 0,
                                                borderBottom: `1px solid ${color.line}`,
                                                boxShadow: active ? `inset 3px 0 0 ${color.gold}` : 'none',
                                                bgcolor: active ? color.surfaceMuted : 'transparent',
                                                cursor: 'pointer',
                                                font: 'inherit',
                                                color: 'inherit',
                                                '&:focus-visible': { outline: `2px solid ${color.focus}`, outlineOffset: -2 },
                                            }}
                                        >
                                            <Typography sx={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {name}
                                            </Typography>
                                            {brief.engagementName && (
                                                <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>{brief.engagementName}</Typography>
                                            )}
                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.4, fontFamily: type.mono }}>
                                                Residual {brief.residualRisk}
                                                {date ? ` · ${date}` : ''}
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} sx={{ mt: 0.65 }} flexWrap="wrap" useFlexGap>
                                                <StatusBadge value={brief.riskBand} kind="severity" />
                                                <StatusBadge kind="plain" tone={rowStatus.tone} label={rowStatus.label} />
                                                {brief.humanDecision && brief.status !== 'DRAFT' && (
                                                    <StatusBadge kind="plain" tone="info" label={recordedDecision(brief.humanDecision)} />
                                                )}
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Surface>

                    {selected && (
                        <Stack spacing={2}>
                            <Surface>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'flex-start' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="overline" sx={{ color: color.goldInk }}>Selected decision</Typography>
                                        <Typography variant="h2" sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>{vendorName}</Typography>
                                        {selected.engagementName && <Typography variant="body2" sx={{ mt: 0.4 }}>{selected.engagementName}</Typography>}
                                        <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 640 }}>
                                            Residual risk, evidence, and the recorded factors. Scores come from the deterministic engine.
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                                            <StatusBadge kind="plain" tone={status.tone} label={status.label} />
                                            <StatusBadge value={selected.riskBand} kind="severity" />
                                            {selected.humanDecision && (
                                                <StatusBadge kind="plain" tone="info" label={recordedDecision(selected.humanDecision)} />
                                            )}
                                        </Stack>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        disabled={busy}
                                        onClick={downloadPdf}
                                        aria-label="Download decision brief PDF"
                                    >
                                        {downloading ? <CircularProgress size={16} /> : 'Download PDF'}
                                    </Button>
                                </Stack>
                                {downloadError && <Alert severity="error" sx={{ mt: 2 }}>{downloadError}</Alert>}
                            </Surface>

                            <DecisionRiskStrip
                                inherent={selected.inherentRisk}
                                residual={selected.residualRisk}
                                band={selected.riskBand}
                                findings={selected.openFindingsCount}
                                alerts={selected.monitoringAlertCount}
                            />

                            <Surface>
                                <EvidenceHealth
                                    confidence={selected.evidenceConfidence}
                                    findings={selected.openFindingsCount}
                                    alerts={selected.monitoringAlertCount}
                                />
                            </Surface>

                            <Surface>
                                <SectionHeader title="Why this score" body="Persisted factors from the deterministic engine, in recorded order. Supreme does not invent weights." />
                                {factors.length === 0 ? (
                                    <Typography variant="body2">No persisted factors on this brief.</Typography>
                                ) : factors.map((factor) => (
                                    <Box key={factor.label} sx={{ py: 1.2, borderBottom: `1px solid ${color.line}` }}>
                                        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
                                            <Typography sx={{ fontWeight: factor.points ? 700 : 500, color: factor.points ? color.ink : color.inkMuted }}>
                                                {factor.label}
                                            </Typography>
                                            <Typography
                                                className="sr-metric"
                                                sx={{
                                                    fontFamily: type.mono,
                                                    fontSize: 15,
                                                    fontWeight: factor.points ? 700 : 500,
                                                    color: factor.points < 0 ? color.low : color.ink,
                                                }}
                                            >
                                                {factor.points > 0 ? '+' : ''}{factor.points}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" sx={{ mt: 0.4, overflowWrap: 'anywhere' }}>{factor.rationale}</Typography>
                                    </Box>
                                ))}
                            </Surface>

                            <Surface>
                                <SectionHeader title="AI-assisted summary" body="A model explanation is interpretation. It is not the score and not the decision." />
                                {selected.aiSummaryStatus === 'SUCCESS' ? (
                                    <Box sx={{ p: 2, bgcolor: color.surfaceMuted, borderRadius: '8px', border: `1px solid ${color.line}` }}>
                                        <Typography variant="body2">{selected.aiSummary || 'A summary is available. AI does not own this score.'}</Typography>
                                        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>AI does not own this score.</Typography>
                                    </Box>
                                ) : (
                                    <Alert severity="warning">
                                        No model summary is available. AI does not own this score.
                                    </Alert>
                                )}
                            </Surface>

                            <Surface>
                                <SectionHeader
                                    title={selected.status === 'DRAFT' ? 'Human decision' : 'Recorded decision'}
                                    body={selected.status === 'DRAFT'
                                        ? 'The person with authority records the outcome. Historical briefs stay immutable after this.'
                                        : 'This brief is an immutable historical record.'}
                                />
                                {selected.status === 'DRAFT' ? (
                                    <Box component="form" onSubmit={decide}>
                                        <Stack spacing={2}>
                                            <TextField
                                                select
                                                label="Decision"
                                                value={decision}
                                                onChange={(e) => setDecision(e.target.value)}
                                                disabled={deciding}
                                                helperText="The API records this exact value. Request changes is sent as ESCALATE."
                                            >
                                                {decisions.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                                ))}
                                            </TextField>
                                            <TextField
                                                label="Conditions or residual-risk rationale"
                                                value={conditions}
                                                onChange={(e) => setConditions(e.target.value)}
                                                disabled={deciding}
                                                helperText="Required context when approving with conditions or accepting residual risk."
                                            />
                                            <TextField
                                                label="Reviewer analysis"
                                                multiline
                                                minRows={3}
                                                value={analysis}
                                                onChange={(e) => setAnalysis(e.target.value)}
                                                disabled={deciding}
                                                helperText="What the reviewer examined. This becomes part of the immutable record."
                                            />
                                            <Button type="submit" variant="contained" disabled={busy} aria-busy={deciding || undefined}>
                                                {deciding ? 'Recording…' : 'Record decision'}
                                            </Button>
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Box sx={{ p: 2, border: `1px solid ${color.lineStrong}`, borderRadius: '8px', bgcolor: color.surfaceMuted }}>
                                        <Typography sx={{ fontWeight: 700 }}>{recordedDecision(selected.humanDecision)}</Typography>
                                        <Typography variant="body2" sx={{ mt: 0.75 }}>Historical briefs are immutable. The form is closed.</Typography>
                                        {selected.conditions && (
                                            <Typography variant="body2" sx={{ mt: 1.25, overflowWrap: 'anywhere' }}>
                                                Conditions: {selected.conditions}
                                            </Typography>
                                        )}
                                        {selected.reviewerAnalysis && (
                                            <Typography variant="body2" sx={{ mt: 1, overflowWrap: 'anywhere' }}>
                                                Reviewer analysis: {selected.reviewerAnalysis}
                                            </Typography>
                                        )}
                                        {selected.decidedAt && briefDate(selected) && (
                                            <Typography variant="caption" sx={{ display: 'block', mt: 1.25 }}>
                                                Recorded {briefDate(selected)}
                                            </Typography>
                                        )}
                                    </Box>
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
