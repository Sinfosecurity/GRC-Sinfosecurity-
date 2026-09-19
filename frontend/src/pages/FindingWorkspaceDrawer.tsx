import { useEffect, useState } from 'react';
import { Alert, Box, Button, Drawer, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import StatusBadge from '../components/design/StatusBadge';
import { intakeAPI, tprmAPI } from '../services/api';
import { color, type } from '../design/tokens';
import { humanizeLabel } from '../utils/humanizeLabel';

type Workspace = {
    header: { id: string; title: string; originalTitle: string; severity: string; status: string; createdAt: string; updatedAt: string; ownerName: string };
    source: { kind: string; label: string; vendorName: string; assessmentType?: string | null; questionId?: string | null; section?: string | null; pack?: string | null };
    observed: { question: string; answer: string; recorded: boolean };
    reason: string;
    control: { key?: string | null; href?: string | null; expected: string; riskDomain?: string | null };
    evidence: { requested: boolean; received: number; missing: boolean; items: Array<{ id: string; filename: string; status: string }>; empty: string | null };
    risk: { vendorTier: string; residualScoreRecorded: number | null; residualHonesty: string; insuranceContext?: { serviceCategory: string; criticality?: string | null; jurisdictionCode?: string | null } | null; engagementLabel?: string | null };
    remediation: { plan?: string | null; targetDate?: string | null; ownerName?: string | null; responsibilityLabel: string; status: string };
    verification: { notes?: string | null; verifiedBy?: string | null; verifiedAt?: string | null; canMarkComplete: boolean };
    nextAction: { key: string; label: string; detail: string; primary: 'plan' | 'await' | 'verify' | 'close' | 'none' | 'review' };
    related: Array<{ type: string; label: string; href?: string | null }>;
    history: Array<{ at: string; label: string; actor?: string | null }>;
    graphNodeId?: string;
    honesty: Record<string, string>;
    reviewState?: string;
    engagement?: { id: string; publicId: string; serviceName: string } | null;
    recommendedSeverity?: string | null;
    determinationNote?: string | null;
};

function Meta({ label, value }: { label: string; value?: string | null }) {
    return (
        <Box>
            <Typography variant="caption" display="block">{label}</Typography>
            <Typography variant="body2">{value || 'Not recorded'}</Typography>
        </Box>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box sx={{ pt: 2.25, mt: 2.25, borderTop: `1px solid ${color.line}` }}>
            <Typography sx={{ fontFamily: type.display, fontSize: 18, mb: 1 }}>{title}</Typography>
            {children}
        </Box>
    );
}

export default function FindingWorkspaceDrawer({
    issueId,
    onClose,
    onChanged,
}: {
    issueId: string | null;
    onClose: () => void;
    onChanged: () => Promise<void> | void;
}) {
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [cap, setCap] = useState('');
    const [target, setTarget] = useState('');
    const [notes, setNotes] = useState('');
    const [determination, setDetermination] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await tprmAPI.findingWorkspace(id);
            const data = res.data.data as Workspace;
            setWorkspace(data);
            setCap(data.remediation.plan || '');
            setTarget(data.remediation.targetDate?.slice(0, 10) || '');
            setNotes(data.verification.notes || '');
        } catch (err: any) {
            setError(err.message || 'Unable to load this finding.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (issueId) load(issueId);
        else setWorkspace(null);
    }, [issueId]);

    const run = async (work: () => Promise<void>) => {
        if (!issueId) return;
        setBusy(true);
        setError(null);
        try {
            await work();
            await load(issueId);
            await onChanged();
        } catch (err: any) {
            setError(err.message || 'The action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const primary = workspace?.nextAction.primary;

    return (
        <Drawer anchor="right" open={Boolean(issueId)} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560, md: 640 } } }}>
            <Box sx={{ p: 3 }} component="aside" aria-label="Finding workspace">
                {loading && <Typography variant="body2">Loading finding…</Typography>}
                {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
                {workspace && (
                    <>
                        <Typography variant="overline">Finding</Typography>
                        <Typography variant="h2" component="h2" sx={{ mb: 1 }}>{workspace.header.title}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                            <StatusBadge value={workspace.header.severity} kind="severity" />
                            <StatusBadge value={workspace.header.status} />
                        </Stack>
                        <Stack spacing={1} sx={{ mb: 2 }}>
                            <Meta label="Finding ID" value={workspace.header.id.slice(0, 8)} />
                            <Meta label="Owner" value={workspace.header.ownerName} />
                            <Meta label="Created" value={workspace.header.createdAt.slice(0, 10)} />
                            <Meta label="Last updated" value={workspace.header.updatedAt.slice(0, 10)} />
                        </Stack>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Next: {workspace.nextAction.label}. {workspace.nextAction.detail}
                        </Alert>

                        {workspace.engagement && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Engagement: {workspace.engagement.publicId} · {workspace.engagement.serviceName}
                                {workspace.reviewState === 'DRAFT' ? ' · Candidate only until confirmed.' : ''}
                            </Alert>
                        )}
                        <Section title="Source">
                            <Typography variant="body2" sx={{ mb: 1 }}>{workspace.source.label}</Typography>
                            <Meta label="Vendor / affected record" value={workspace.source.vendorName} />
                            {workspace.engagement && <Meta label="Engagement" value={`${workspace.engagement.publicId} · ${workspace.engagement.serviceName}`} />}
                            <Meta label="Assessment type" value={workspace.source.assessmentType ? humanizeLabel(workspace.source.assessmentType) : 'Not an assessment finding'} />
                            {workspace.source.section && <Meta label="Section / pack" value={workspace.source.section} />}
                        </Section>

                        <Section title="Observed condition">
                            <Typography variant="caption" display="block">Question</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{workspace.observed.question}</Typography>
                            <Typography variant="caption" display="block">Recorded answer / observation</Typography>
                            <Typography variant="body2">{workspace.observed.answer}</Typography>
                            {!workspace.observed.recorded && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    {workspace.honesty.noResponseIsNotNo}
                                </Typography>
                            )}
                        </Section>

                        <Section title="Why this is a finding">
                            <Typography variant="body2">{workspace.reason}</Typography>
                        </Section>

                        <Section title="Control / requirement">
                            <Typography variant="body2">{workspace.control.expected}</Typography>
                            {workspace.control.riskDomain && <Meta label="Risk domain" value={workspace.control.riskDomain} />}
                            {workspace.control.href && (
                                <Button component={RouterLink} to={workspace.control.href} size="small" sx={{ mt: 1, px: 0 }}>
                                    Open controls
                                </Button>
                            )}
                        </Section>

                        <Section title="Evidence">
                            {workspace.evidence.empty && <Typography variant="body2">{workspace.evidence.empty}</Typography>}
                            {workspace.evidence.items.map((item) => (
                                <Typography key={item.id} variant="body2">{item.filename} — {humanizeLabel(item.status)}</Typography>
                            ))}
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>{workspace.honesty.noEvidenceIsNotFailure}</Typography>
                        </Section>

                        {workspace.reviewState === 'DRAFT' && workspace.engagement && (
                            <Section title="Candidate determination">
                                <TextField label="Reason" value={determination} onChange={(e) => setDetermination(e.target.value)} fullWidth multiline minRows={2} />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                                    <Button variant="contained" disabled={busy} onClick={() => run(async () => {
                                        await intakeAPI.confirmFinding(workspace.engagement!.id, workspace.header.id, { determinationNote: determination });
                                    })}>Confirm finding</Button>
                                    <Button disabled={busy || !determination} onClick={() => run(async () => {
                                        await intakeAPI.dismissCandidate(workspace.engagement!.id, workspace.header.id, { reason: determination });
                                    })}>Dismiss / no finding</Button>
                                </Stack>
                            </Section>
                        )}

                        <Section title="Risk / business context">
                            <Meta label="Vendor tier" value={humanizeLabel(workspace.risk.vendorTier)} />
                            <Meta label="Engagement residual context" value={workspace.risk.engagementLabel || 'Not an Engagement finding'} />
                            <Meta label="Legacy vendor residual" value={workspace.risk.residualScoreRecorded == null ? 'Not scored' : String(workspace.risk.residualScoreRecorded)} />
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{workspace.risk.residualHonesty}</Typography>
                            {workspace.risk.insuranceContext && (
                                <Meta
                                    label="Insurance context"
                                    value={`${workspace.risk.insuranceContext.serviceCategory}${workspace.risk.insuranceContext.jurisdictionCode ? ` · ${workspace.risk.insuranceContext.jurisdictionCode}` : ''}`}
                                />
                            )}
                        </Section>

                        <Section title="Related records">
                            {workspace.related.length === 0 && <Typography variant="body2">No related records are stored for this item yet.</Typography>}
                            <Stack spacing={0.75}>
                                {workspace.related.map((row) => (
                                    <Box key={`${row.type}-${row.label}`}>
                                        <Typography variant="body2">{row.type}: {row.label}</Typography>
                                        {row.href && <Button component={RouterLink} to={row.href} size="small" sx={{ px: 0 }}>Open {row.type.toLowerCase()}</Button>}
                                    </Box>
                                ))}
                            </Stack>
                            {workspace.graphNodeId && (
                                <Button component={RouterLink} to={`/governance-graph?nodeId=${workspace.graphNodeId}`} size="small" sx={{ mt: 1 }}>
                                    Open graph
                                </Button>
                            )}
                        </Section>

                        <Section title="Remediation">
                            <Meta label="Responsibility" value={workspace.remediation.responsibilityLabel} />
                            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                                <TextField label="Corrective action plan" multiline minRows={3} value={cap} onChange={(e) => setCap(e.target.value)} />
                                <TextField type="date" label="Target remediation" InputLabelProps={{ shrink: true }} value={target} onChange={(e) => setTarget(e.target.value)} />
                                {primary === 'plan' && (
                                    <Button variant="contained" disabled={busy || !cap || !target} onClick={() => run(async () => {
                                        await tprmAPI.updateFindingCap(issueId!, { correctiveActionPlan: cap, targetRemediationDate: new Date(target).toISOString() });
                                    })}>
                                        Record remediation plan
                                    </Button>
                                )}
                                {primary !== 'plan' && workspace.remediation.plan && (
                                    <Button disabled={busy || !cap || !target} onClick={() => run(async () => {
                                        await tprmAPI.updateFindingCap(issueId!, { correctiveActionPlan: cap, targetRemediationDate: new Date(target).toISOString() });
                                    })}>
                                        Update plan
                                    </Button>
                                )}
                            </Stack>
                        </Section>

                        <Section title="Verification">
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                Verification records who checked the remediation and when. It is not closure and not control certification.
                            </Typography>
                            {workspace.verification.verifiedBy && (
                                <Meta label="Verified" value={`${workspace.verification.verifiedBy} · ${workspace.verification.verifiedAt?.slice(0, 10) || ''}`} />
                            )}
                            <TextField
                                sx={{ mt: 1.5 }}
                                label="Validation notes"
                                multiline
                                minRows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                helperText="Required before verification can be recorded."
                            />
                            {primary === 'verify' && (
                                <Button variant="contained" sx={{ mt: 1.5 }} disabled={busy || !notes.trim()} onClick={() => run(async () => {
                                    await tprmAPI.validateFinding(issueId!, { approved: true, validationNotes: notes.trim() });
                                })}>
                                    Record verification
                                </Button>
                            )}
                            {primary !== 'verify' && workspace.verification.canMarkComplete && (
                                <Button sx={{ mt: 1.5 }} disabled={busy || !notes.trim()} onClick={() => run(async () => {
                                    await tprmAPI.validateFinding(issueId!, { approved: true, validationNotes: notes.trim() });
                                })}>
                                    Record verification
                                </Button>
                            )}
                        </Section>

                        <Section title="History">
                            <Stack spacing={0.75}>
                                {workspace.history.map((row, index) => (
                                    <Typography key={`${row.label}-${index}`} variant="body2">
                                        {String(row.at).slice(0, 10)} — {row.label}{row.actor ? ` · ${row.actor}` : ''}
                                    </Typography>
                                ))}
                            </Stack>
                        </Section>

                        <Stack spacing={1} sx={{ mt: 3 }}>
                            {primary === 'close' && (
                                <Button variant="contained" disabled={busy} onClick={() => run(async () => {
                                    await tprmAPI.closeFinding(issueId!, { closureNotes: notes.trim() || 'Closed from findings workspace' });
                                })}>
                                    Close finding
                                </Button>
                            )}
                            {primary !== 'close' && (
                                <Typography variant="caption">
                                    Close remains available only after verification and required evidence. Closing a finding is not control certification.
                                </Typography>
                            )}
                            <Button onClick={onClose}>Close panel</Button>
                        </Stack>
                    </>
                )}
            </Box>
        </Drawer>
    );
}
