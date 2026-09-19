import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';

export default function EngagementRisk() {
    const { id = '' } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [controlId, setControlId] = useState('');
    const [rating, setRating] = useState('PARTIALLY_EFFECTIVE');
    const [rationale, setRationale] = useState('');
    const [compDescription, setCompDescription] = useState('');
    const [compOwner, setCompOwner] = useState('');
    const [confirmNote, setConfirmNote] = useState('');
    const [severity, setSeverity] = useState('HIGH');
    const [determination, setDetermination] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getEngagementRisk(id)
            .then((res) => {
                setData(res.data.data);
                const first = res.data.data.applicableControls?.[0];
                if (first && !controlId) setControlId(first.id || first.controlKey);
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load Engagement risk.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const run = async (work: () => Promise<any>, success: string) => {
        setBusy(true);
        setError(null);
        try {
            const res = await work();
            setData(res.data.data.thirdParty ? res.data.data : data);
            setMessage(success);
            load();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The risk action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const confirm = (issueId: string) => {
        run(() => intakeAPI.confirmFinding(id, issueId, {
            severity,
            determinationNote: determination,
        }), 'Finding confirmed. This is now an authoritative Engagement finding.');
    };

    const dismiss = (issueId: string) => {
        run(() => intakeAPI.dismissCandidate(id, issueId, { reason: determination || 'Reviewed. No finding warranted.' }), 'Candidate dismissed. History is preserved and it does not count as open risk.');
    };

    const saveControl = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.recordControlEffectiveness(id, { controlId, rating, rationale }), 'Control effectiveness recorded for this Engagement only.');
    };

    const saveCompensating = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.recordCompensatingControl(id, {
            description: compDescription,
            owner: compOwner,
            affectedControlId: controlId,
            effectivenessJudgment: 'PARTIALLY_EFFECTIVE',
            consideredInResidual: true,
        }), 'Compensating control recorded. It does not erase a finding.');
    };

    return (
        <PageShell>
            <PageHeader
                crumbs={[
                    { label: 'Third Parties', to: '/vendor-management' },
                    { label: data?.engagement?.publicId || 'Engagement', to: `/engagements/${id}` },
                    { label: 'Engagement risk' },
                ]}
                title={data ? `Engagement risk · ${data.what}` : 'Engagement risk'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.statusLabel} /> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Risk workspace not found" emptyBody="Complete specialist review first.">
                {data && (
                    <Stack spacing={2} sx={{ overflowX: 'hidden' }}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                        <Surface>
                            <Typography><strong>Confirmed inherent:</strong> {data.confirmedInherent?.confirmedTier || 'Not confirmed'}</Typography>
                            <Typography><strong>Inherent source:</strong> {data.confirmedInherent?.source || 'Blocked until Wave 2 confirmation'}</Typography>
                            <Typography><strong>Findings:</strong> {(data.findings || []).length} confirmed · {(data.candidates || []).length} candidates</Typography>
                            <Typography><strong>Control effectiveness:</strong> {(data.controls || []).map((row: any) => `${row.controlTitle}: ${row.rating}`).join('; ') || 'Not assessed'}</Typography>
                            <Typography><strong>Residual:</strong> {data.residual?.residualBand || (data.residualReady ? 'Ready to calculate' : 'Not ready')}</Typography>
                            <Typography><strong>Methodology:</strong> {data.methodology?.version}</Typography>
                            <Typography><strong>Next action:</strong> {data.nextAction}</Typography>
                            <Typography variant="caption" display="block">Wave 5 treatment, acceptance, and contracting have not started.</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Finding candidates</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>A negative answer or missing evidence can create a candidate. It is not a finding until confirmed.</Typography>
                            <TextField select sx={{ mt: 1, mr: 1, minWidth: 140 }} label="Confirm severity" value={severity} onChange={(event) => setSeverity(event.target.value)}>
                                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                            </TextField>
                            <TextField sx={{ mt: 1 }} label="Determination / dismiss reason" value={determination} onChange={(event) => setDetermination(event.target.value)} fullWidth />
                            {(data.candidates || []).map((row: any) => (
                                <Stack key={row.id} spacing={0.5} sx={{ mt: 1.5 }}>
                                    <Typography><strong>{row.title}</strong></Typography>
                                    <Typography variant="body2">{row.engagement?.serviceName} · recommended {row.recommendedSeverity} · {row.draftRuleCode}</Typography>
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        <Button disabled={busy} onClick={() => confirm(row.id)}>Confirm finding</Button>
                                        <Button disabled={busy} onClick={() => dismiss(row.id)}>Dismiss / no finding</Button>
                                    </Stack>
                                </Stack>
                            ))}
                            {!(data.candidates || []).length && <Typography variant="body2">No open candidates.</Typography>}
                            {(data.findings || []).map((row: any) => (
                                <Typography key={row.id} sx={{ mt: 1 }}>{row.title} · {row.severity} · {row.status}</Typography>
                            ))}
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Control effectiveness</Typography>
                            <Typography variant="body2">Same Shared Control can be Effective on one Engagement and Partially effective on another.</Typography>
                            {(data.applicableControls || data.controls || []).map((row: any) => (
                                <Typography key={row.id || row.controlId} variant="body2">
                                    {row.title || row.controlTitle} · {row.domain} · {row.recorded?.rating || row.rating || 'NOT_ASSESSED'}
                                </Typography>
                            ))}
                            <Stack component="form" onSubmit={saveControl} spacing={1} sx={{ mt: 1 }}>
                                <TextField select label="Control" value={controlId} onChange={(event) => setControlId(event.target.value)} fullWidth>
                                    {(data.applicableControls || []).map((row: any) => (
                                        <MenuItem key={row.id} value={row.id}>{row.title}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField select label="Effectiveness" value={rating} onChange={(event) => setRating(event.target.value)} fullWidth>
                                    {['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_APPLICABLE', 'NOT_ASSESSED'].map((item) => (
                                        <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} fullWidth />
                                <Button type="submit" disabled={busy || !controlId}>Record control effectiveness</Button>
                            </Stack>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Compensating controls</Typography>
                            {(data.compensating || []).map((row: any) => (
                                <Typography key={row.id} variant="body2">{row.description} · {row.consideredInResidual ? 'considered in residual' : 'not considered'}</Typography>
                            ))}
                            <Stack component="form" onSubmit={saveCompensating} spacing={1} sx={{ mt: 1 }}>
                                <TextField label="Description" value={compDescription} onChange={(event) => setCompDescription(event.target.value)} fullWidth />
                                <TextField label="Owner" value={compOwner} onChange={(event) => setCompOwner(event.target.value)} fullWidth />
                                <Button type="submit" disabled={busy || !compDescription}>Record compensating control</Button>
                            </Stack>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Residual risk</Typography>
                            {!data.residual && (
                                <Typography>{data.readiness?.blockers?.[0] || 'Residual risk not ready'}</Typography>
                            )}
                            {data.residual && (
                                <Stack spacing={0.5}>
                                    <Typography><strong>Result:</strong> {data.residual.residualBand} {data.residual.residualScore != null ? `(${data.residual.residualScore})` : ''}</Typography>
                                    <Typography><strong>Inherent:</strong> {data.residual.inherent?.tier} from {data.residual.inherent?.source}</Typography>
                                    <Typography><strong>Explanation:</strong> {data.residual.explanation}</Typography>
                                    {(data.residual.factors || []).map((factor: any) => (
                                        <Typography key={factor.code} variant="body2">{factor.label}: {factor.points} — {factor.rationale}</Typography>
                                    ))}
                                    <Typography variant="caption">Calculated {data.residual.calculatedAt || 'not yet'} · {data.residual.methodologyVersion}</Typography>
                                </Stack>
                            )}
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                <Button disabled={busy} onClick={() => run(() => intakeAPI.calculateResidual(id), 'Engagement residual risk calculated.')}>Calculate residual risk</Button>
                                <Button disabled={busy || !data.residual} onClick={() => run(() => intakeAPI.confirmResidual(id, { note: confirmNote }), 'Residual risk confirmed. Risk treatment decision pending.')}>Confirm residual assessment</Button>
                            </Stack>
                            <TextField sx={{ mt: 1 }} label="Confirmation note" value={confirmNote} onChange={(event) => setConfirmNote(event.target.value)} fullWidth />
                            <Typography variant="subtitle2" sx={{ mt: 2 }}>History</Typography>
                            {(data.history || []).map((row: any) => (
                                <Typography key={row.id} variant="body2">{String(row.createdAt || '').slice(0, 10)} · {row.residualBand || row.status} · {row.triggerReason}</Typography>
                            ))}
                            <Typography variant="subtitle2" sx={{ mt: 2 }}>Third Party rollup (does not overwrite Engagements)</Typography>
                            <Typography>Highest active Engagement risk: {data.thirdPartyRollup?.highestActiveBand || 'Not yet calculated'}</Typography>
                            {(data.thirdPartyRollup?.engagements || []).map((row: any) => (
                                <Typography key={row.id} variant="body2">{row.serviceName} — {row.residualBand || 'Not yet calculated'}</Typography>
                            ))}
                            {data.legacyVendorRisk && (
                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>{data.legacyVendorRisk.label}: {data.legacyVendorRisk.residualRiskScore ?? 'none'}</Typography>
                            )}
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
