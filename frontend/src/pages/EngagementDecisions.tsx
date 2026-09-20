import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { intakeAPI } from '../services/api';

const TYPES = ['MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID'];
const SOURCES = ['CONFIRMED_FINDING', 'CONTROL_GAP', 'TREATMENT_DECISION', 'REGULATORY_REQUIREMENT', 'INSURANCE_PACK', 'ORGANIZATION_POLICY', 'HUMAN_ADDED'];
const MECHANISMS = ['INSURANCE', 'CONTRACTUAL_INDEMNITY', 'SERVICE_ARCHITECTURE', 'OTHER'];

export default function EngagementDecisions() {
    const { id = '' } = useParams();
    const outlet = useOutletContext<{ engagement?: any } | undefined>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [type, setType] = useState('ACCEPT');
    const [rationale, setRationale] = useState('');
    const [conditions, setConditions] = useState('');
    const [reviewAt, setReviewAt] = useState('');
    const [mitigationAction, setMitigationAction] = useState('');
    const [mitigationDueDate, setMitigationDueDate] = useState('');
    const [transferMechanism, setTransferMechanism] = useState('INSURANCE');
    const [requirement, setRequirement] = useState('');
    const [source, setSource] = useState('CONFIRMED_FINDING');
    const [sourceRef, setSourceRef] = useState('');
    const [sourceRationale, setSourceRationale] = useState('');
    const [comment, setComment] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getDecisions(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load Engagement decisions.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const run = async (work: () => Promise<any>, success: string) => {
        setBusy(true);
        setError(null);
        try {
            const res = await work();
            setData(res.data.data);
            setMessage(success);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The decision action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const residual = data?.residual;
    const blockers = data?.gate?.blockers || [];
    const primary = data?.nextAction || outlet?.engagement?.nextAction || 'Review risk treatment';

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Decisions not available" emptyBody="Confirm residual risk before opening treatment.">
            {data && (
                <Stack spacing={2} sx={{ overflowX: 'hidden' }}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error" role="alert">{error}</Alert>}
                    <Surface>
                        <Typography variant="h6" component="h2">Primary next action</Typography>
                        <Typography data-testid="primary-next-action"><strong>{primary}</strong></Typography>
                        {data.postActivation && <Typography>{data.postActivation}</Typography>}
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Residual risk</Typography>
                        <Typography><strong>Third Party:</strong> {data.thirdParty?.name || 'Not recorded'}</Typography>
                        <Typography><strong>Engagement:</strong> {data.engagement?.serviceName || 'Not recorded'}</Typography>
                        <Typography><strong>Business purpose:</strong> {data.engagement?.businessPurpose || 'Not recorded'}</Typography>
                        <Typography><strong>Business owner:</strong> {data.engagement?.businessOwnerName || 'Not recorded'}</Typography>
                        <Typography><strong>Confirmed inherent:</strong> {data.confirmedInherent?.confirmedTier || 'Not yet assessed'}</Typography>
                        <Typography><strong>Current residual:</strong> {residual ? `${residual.residualBand} ${residual.residualScore}` : 'Not calculated'}</Typography>
                        <Typography variant="body2">Risk acceptance does not lower residual risk.</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Treatment</Typography>
                        <Typography><strong>Selected:</strong> {data.treatment?.type || 'Not selected'} · {data.treatment?.status || 'None'}</Typography>
                        <TextField select label="Treatment type" value={type} onChange={(event) => setType(event.target.value)} sx={{ mt: 1, minWidth: 180 }}>
                            {TYPES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                        </TextField>
                        <TextField sx={{ mt: 1 }} label="Treatment rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} fullWidth multiline minRows={2} />
                        <TextField sx={{ mt: 1 }} label="Conditions" value={conditions} onChange={(event) => setConditions(event.target.value)} fullWidth />
                        {type === 'ACCEPT' && (
                            <TextField sx={{ mt: 1 }} label="Acceptance review date" type="date" InputLabelProps={{ shrink: true }} value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} />
                        )}
                        {type === 'MITIGATE' && (
                            <>
                                <TextField sx={{ mt: 1 }} label="Mitigation action" value={mitigationAction} onChange={(event) => setMitigationAction(event.target.value)} fullWidth />
                                <TextField sx={{ mt: 1 }} label="Mitigation due date" type="date" InputLabelProps={{ shrink: true }} value={mitigationDueDate} onChange={(event) => setMitigationDueDate(event.target.value)} />
                            </>
                        )}
                        {type === 'TRANSFER' && (
                            <TextField select sx={{ mt: 1, minWidth: 220 }} label="Transfer mechanism" value={transferMechanism} onChange={(event) => setTransferMechanism(event.target.value)}>
                                {MECHANISMS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                            </TextField>
                        )}
                        <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.selectTreatment(id, {
                            type,
                            rationale,
                            conditions,
                            reviewAt: reviewAt ? new Date(reviewAt).toISOString() : undefined,
                            mitigationAction,
                            mitigationDueDate: mitigationDueDate ? new Date(mitigationDueDate).toISOString() : undefined,
                            transferMechanism,
                            relatedFindingIds: (data.openFindings || []).map((row: any) => row.id),
                        }), 'Treatment recorded.')}>Select treatment</Button>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Acceptance</Typography>
                        <Typography><strong>Status:</strong> {data.acceptance?.status || 'Not requested'}</Typography>
                        <Typography><strong>Residual snapshot:</strong> {data.acceptance ? `${data.acceptance.residualBandSnapshot} ${data.acceptance.residualScoreSnapshot}` : 'None'}</Typography>
                        <TextField sx={{ mt: 1 }} label="Approver comment" value={comment} onChange={(event) => setComment(event.target.value)} fullWidth />
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.decideAcceptance(id, { decision: 'APPROVED', comment }), 'Acceptance approved. Residual is unchanged.')}>Approve acceptance</Button>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.decideAcceptance(id, { decision: 'REJECTED', comment }), 'Acceptance rejected.')}>Reject acceptance</Button>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.decideAcceptance(id, { decision: 'RETURNED', comment }), 'Acceptance returned.')}>Return acceptance</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Approvals</Typography>
                        {(data.approvals || []).map((row: any) => (
                            <Typography key={row.id} variant="body2">{row.type} · {row.status} · {row.capability}</Typography>
                        ))}
                        {!(data.approvals || []).length && <Typography variant="body2">No Engagement approvals recorded.</Typography>}
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Contract requirements</Typography>
                        {(data.contractRequirements || []).map((row: any) => (
                            <Stack key={row.id} spacing={0.5} sx={{ mt: 1 }}>
                                <Typography>{row.requirement} · {row.source} · {row.mandatory ? 'Mandatory' : 'Optional'} · {row.status}</Typography>
                                {row.status !== 'SATISFIED' && (
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.updateContractRequirement(id, row.id, { status: 'SATISFIED', evidenceRef: row.sourceRef || 'Recorded on Engagement' }), 'Requirement updated.')}>Mark satisfied</Button>
                                )}
                            </Stack>
                        ))}
                        <TextField sx={{ mt: 1 }} label="Requirement" value={requirement} onChange={(event) => setRequirement(event.target.value)} fullWidth />
                        <TextField select sx={{ mt: 1, minWidth: 220 }} label="Requirement source" value={source} onChange={(event) => setSource(event.target.value)}>
                            {SOURCES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                        </TextField>
                        <TextField sx={{ mt: 1 }} label="Source reference" value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} fullWidth />
                        <TextField sx={{ mt: 1 }} label="Why this requirement exists" value={sourceRationale} onChange={(event) => setSourceRationale(event.target.value)} fullWidth />
                        <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.createContractRequirement(id, {
                            requirement,
                            source,
                            sourceRef: sourceRef || data.openFindings?.[0]?.id,
                            sourceRationale,
                            mandatory: true,
                        }), 'Contract requirement recorded.')}>Add requirement</Button>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Contract gate</Typography>
                        <Typography><strong>Status:</strong> {data.gate?.status || 'NOT_READY'}</Typography>
                        <Typography component="p">Exact blockers:</Typography>
                        <ul aria-label="Contract gate blockers">
                            {blockers.length
                                ? blockers.map((row: any) => <li key={row.code}><a href={row.href}>{row.label}</a></li>)
                                : <li>No mandatory blockers.</li>}
                        </ul>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.evaluateGate(id), 'Gate evaluated.')}>Evaluate gate</Button>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.activateEngagement(id), 'Engagement Active. Monitoring setup pending Wave 6.')}>Activate Engagement</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Decision briefs</Typography>
                        {(data.decisionBriefs || []).map((row: any) => (
                            <Typography key={row.id} variant="body2">Version {row.versionNumber} · {row.riskBand} {row.residualRisk} · {row.status}</Typography>
                        ))}
                        {!(data.decisionBriefs || []).length && <Typography variant="body2">No Engagement decision brief yet.</Typography>}
                        <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.generateDecisionBrief(id), 'Decision brief snapshot created.')}>Generate decision brief</Button>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Sibling engagements</Typography>
                        {(data.siblings || []).map((row: any) => (
                            <Typography key={row.id} variant="body2">{row.serviceName} · {row.status}{row.current ? ' · current' : ''}</Typography>
                        ))}
                    </Surface>
                </Stack>
            )}
        </QueryState>
    );
}
