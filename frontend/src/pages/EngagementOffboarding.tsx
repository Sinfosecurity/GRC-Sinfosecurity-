import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { intakeAPI } from '../services/api';

const CATEGORIES = [
    'BUSINESS_TRANSITION',
    'ACCESS_REVOCATION',
    'INTEGRATION_CLOSURE',
    'CREDENTIAL_REVOCATION',
    'DATA_RETURN',
    'DATA_DELETION',
    'DATA_RETENTION',
    'SUBPROCESSOR_CLOSURE',
    'ASSET_RETURN',
    'CONTRACT_NOTICE',
    'FINAL_PAYMENT',
    'EVIDENCE_COLLECTION',
    'LEGAL_RETENTION',
    'BUSINESS_CONTINUITY',
    'KNOWLEDGE_TRANSFER',
];

export default function EngagementOffboarding() {
    const { id = '' } = useParams();
    const outlet = useOutletContext<{ engagement?: any } | undefined>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [category, setCategory] = useState('BUSINESS_TRANSITION');
    const [obligationTitle, setObligationTitle] = useState('');
    const [mandatory, setMandatory] = useState('yes');
    const [verification, setVerification] = useState('');
    const [evidenceId, setEvidenceId] = useState('');
    const [exceptionReason, setExceptionReason] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [selectedObligation, setSelectedObligation] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getOffboarding(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load Engagement offboarding.'))
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
            setError(err.response?.data?.error?.message || 'The offboarding action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const active = data?.active || (data?.current && data.current.status !== 'CANCELLED' ? data.current : null);
    const caseIsOpen = Boolean(data?.active);
    const obligations = data?.obligations || [];
    const exceptions = data?.exceptions || [];
    const disposition = (data?.dispositions || []).slice(-1)[0];
    const historical = data?.historicalResidual;
    const gate = data?.gate;

    return (
        <QueryState loading={loading} error={error && !data ? error : null} empty={!loading && !data} emptyTitle="Offboarding not available" emptyBody="Open an Active Engagement to record an authorized termination decision.">
            {data && (
                <Stack spacing={2} sx={{ overflowX: 'hidden' }}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error" role="alert">{error}</Alert>}
                    <Surface>
                        <Typography variant="h6" component="h2">Primary next action</Typography>
                        <Typography data-testid="primary-next-action"><strong>{data.nextAction || outlet?.engagement?.nextAction}</strong></Typography>
                        <Typography variant="body2">{data.honesty}</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Historical residual — Cycle 1</Typography>
                        <Typography>Band / score: {historical ? `${historical.residualBand} ${historical.residualScore}` : 'Not recorded'}</Typography>
                        <Typography variant="body2">Termination does not rewrite prior risk truth. Cycle 1 remains inspectable.</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Third Party aggregation</Typography>
                        <Typography>{data.thirdPartyAggregate?.honesty}</Typography>
                        <Typography variant="body2">Offboarding belongs to this Engagement. Sibling Engagements are not closed automatically.</Typography>
                    </Surface>
                    {!active && data.engagement?.status !== 'OFFBOARDED' && (
                        <Surface>
                            <Typography variant="h6" component="h2">Termination decision</Typography>
                            <Typography variant="body2">Wave 7 may recommend termination. Wave 8 requires an explicit authorized decision. Monitoring does not terminate automatically.</Typography>
                            {data.openReassessment && (
                                <Alert severity="warning" sx={{ my: 1 }} role="alert">
                                    An open reassessment has no disposition. Complete it, cancel it with a rationale, or supersede it due to termination.
                                </Alert>
                            )}
                            <TextField sx={{ mt: 1 }} required label="Why is this Engagement ending?" value={reason} onChange={(event) => setReason(event.target.value)} fullWidth multiline minRows={2} />
                            <TextField sx={{ mt: 1 }} type="date" label="Effective termination date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} InputLabelProps={{ shrink: true }} />
                            <Button sx={{ mt: 1, ml: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.createOffboarding(id, {
                                reason: reason || 'Authorized termination of this Engagement only.',
                                effectiveTerminationDate: effectiveDate || undefined,
                                reassessmentDisposition: data.openReassessment ? 'SUPERSEDE_FOR_TERMINATION' : undefined,
                                reassessmentRationale: data.openReassessment ? 'Superseded because termination was authorized.' : undefined,
                            }), 'Termination approved. Offboarding case created.')}>Start offboarding</Button>
                        </Surface>
                    )}
                    {active && (
                        <>
                            <Surface>
                                <Typography variant="h6" component="h2">Offboarding case</Typography>
                                <Typography>Case: {active.publicId}</Typography>
                                <Typography>Status: {String(active.status).replace(/_/g, ' ')}</Typography>
                                <Typography>Reason: {active.reason}</Typography>
                                <Typography>Effective date: {active.effectiveTerminationDate ? String(active.effectiveTerminationDate).slice(0, 10) : 'Not set'}</Typography>
                                <Typography>Age: {active.startedAt ? `${Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 86400000))} day(s)` : 'Not set'}</Typography>
                                {caseIsOpen && active.status === 'PLANNED' && (
                                    <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.startOffboarding(id), 'Offboarding started. Complete obligations.')}>Start obligation work</Button>
                                )}
                            </Surface>
                            {caseIsOpen && (
                            <Surface>
                                <Typography variant="h6" component="h2">Obligations</Typography>
                                <Typography variant="body2">Humans choose applicability. Access revocation and data deletion are tracked. Manual verification required unless a connected integration confirmed the action.</Typography>
                                <TextField select sx={{ mt: 1, minWidth: 280 }} label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                                    {CATEGORIES.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                                </TextField>
                                <TextField sx={{ mt: 1 }} label="Title" value={obligationTitle} onChange={(event) => setObligationTitle(event.target.value)} fullWidth />
                                <TextField select sx={{ mt: 1, minWidth: 160 }} label="Mandatory" value={mandatory} onChange={(event) => setMandatory(event.target.value)}>
                                    <MenuItem value="yes">Yes</MenuItem>
                                    <MenuItem value="no">No</MenuItem>
                                </TextField>
                                <Button sx={{ mt: 1, ml: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.addOffboardingObligation(id, {
                                    category,
                                    title: obligationTitle || undefined,
                                    mandatory: mandatory === 'yes',
                                }), 'Obligation added. It is not complete until verified.')}>Add obligation</Button>
                            </Surface>
                            )}
                            <Surface padded={false}>
                                <Typography variant="h6" component="h2" sx={{ p: 2, pb: 0 }}>Obligation register</Typography>
                                <AppTable
                                    embedded
                                    rows={obligations}
                                    rowKey={(row: any) => row.id}
                                    emptyTitle="No obligations"
                                    emptyBody="Add only the obligations that apply to this Engagement."
                                    columns={[
                                        { id: 'title', label: 'Obligation', render: (row: any) => row.title },
                                        { id: 'category', label: 'Category', hideOnMobile: true, render: (row: any) => String(row.category).replace(/_/g, ' ') },
                                        { id: 'status', label: 'Status', render: (row: any) => String(row.status).replace(/_/g, ' ') },
                                        { id: 'due', label: 'Due', hideOnMobile: true, render: (row: any) => row.dueAt ? String(row.dueAt).slice(0, 10) : 'Not set' },
                                        { id: 'verify', label: 'Verification', hideOnMobile: true, render: (row: any) => row.internalVerification || row.vendorConfirmation || 'Manual verification required' },
                                    ]}
                                    onRowClick={(row: any) => setSelectedObligation(row.id)}
                                />
                            </Surface>
                            {caseIsOpen && (
                            <>
                            <Surface>
                                <Typography variant="h6" component="h2">Complete or evidence an obligation</Typography>
                                <TextField select sx={{ mt: 1, minWidth: 280 }} label="Obligation" value={selectedObligation} onChange={(event) => setSelectedObligation(event.target.value)}>
                                    {obligations.map((row: any) => <MenuItem key={row.id} value={row.id}>{row.title}</MenuItem>)}
                                </TextField>
                                <TextField sx={{ mt: 1 }} label="Internal verification or vendor confirmation" value={verification} onChange={(event) => setVerification(event.target.value)} fullWidth multiline minRows={2} helperText="Do not claim Azure access revoked or data deleted unless a connected integration confirmed it." />
                                <TextField sx={{ mt: 1 }} label="Shared Evidence object ID" value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} fullWidth helperText="Reuse Shared Evidence. No offboarding-specific file store." />
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                    <Button disabled={busy || !selectedObligation} onClick={() => run(() => intakeAPI.updateOffboardingObligation(id, selectedObligation, {
                                        status: 'COMPLETED',
                                        internalVerification: verification || 'Manual verification recorded.',
                                    }), 'Obligation verified. Completion is not inferred from case closure.')}>Record verification</Button>
                                    <Button disabled={busy || !selectedObligation || !evidenceId} onClick={() => run(() => intakeAPI.linkOffboardingEvidence(id, {
                                        obligationId: selectedObligation,
                                        storedObjectId: evidenceId,
                                    }), 'Shared Evidence linked.')}>Link Shared Evidence</Button>
                                </Stack>
                            </Surface>
                            <Surface>
                                <Typography variant="h6" component="h2">Exceptions</Typography>
                                <Typography variant="body2">An exception does not mark the obligation complete.</Typography>
                                <TextField sx={{ mt: 1 }} label="Why this obligation cannot be completed" value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} fullWidth multiline minRows={2} />
                                <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.createOffboardingException(id, {
                                    obligationId: selectedObligation || undefined,
                                    reason: exceptionReason || 'Governed exception recorded. The task is not complete.',
                                }), 'Exception recorded. The obligation is not marked complete.')}>Record exception</Button>
                                {exceptions.map((row: any) => (
                                    <Typography key={row.id} variant="body2">{row.status}: {row.reason}</Typography>
                                ))}
                            </Surface>
                            <Surface>
                                <Typography variant="h6" component="h2">Cancel before closure</Typography>
                                <TextField sx={{ mt: 1 }} label="Cancellation reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} fullWidth />
                                <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.cancelOffboarding(id, { reason: cancelReason || 'Offboarding cancelled before closure.' }), 'Offboarding cancelled. The Engagement remains active.')}>Cancel offboarding</Button>
                            </Surface>
                            </>
                            )}
                            <Surface>
                                <Typography variant="h6" component="h2">Closure gate</Typography>
                                <Typography>Ready: {gate?.ready ? 'Yes' : 'No'}</Typography>
                                <ul aria-label="Closure blockers">
                                    {(gate?.blockers || []).length ? gate.blockers.map((item: string) => <li key={item}>{item}</li>) : <li>No outstanding mandatory blockers.</li>}
                                </ul>
                                {caseIsOpen && (
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        <Button disabled={busy} onClick={() => run(() => intakeAPI.evaluateOffboardingGate(id), 'Closure gate evaluated.')}>Evaluate closure gate</Button>
                                        <Button disabled={busy} onClick={() => run(() => intakeAPI.completeOffboarding(id), 'Engagement offboarded. Historical records remain inspectable.')}>Approve final closure</Button>
                                    </Stack>
                                )}
                            </Surface>
                        </>
                    )}
                    {disposition && (
                        <Surface>
                            <Typography variant="h6" component="h2">Final disposition</Typography>
                            <Typography>Version {disposition.versionNumber} — immutable snapshot</Typography>
                            <Typography>Reason: {disposition.snapshot?.terminationReason}</Typography>
                            <Typography>Closed: {disposition.snapshot?.closedAt ? String(disposition.snapshot.closedAt).slice(0, 10) : 'Not recorded'}</Typography>
                            <Typography variant="body2">A new Engagement is required if the service is needed again. This case cannot be reopened by overwriting history.</Typography>
                        </Surface>
                    )}
                    <Surface>
                        <Typography variant="h6" component="h2">History and honesty</Typography>
                        <Typography>Monitoring: {data.monitoring?.status || 'Not configured'}</Typography>
                        <Typography>Legacy vendor offboarding: {data.legacyVendorOffboarding}</Typography>
                        <Typography>Retention: Not configured unless a recorded policy exists.</Typography>
                        <Typography>Reassessment history: {(data.reassessmentHistory || []).length} cycle(s) retained.</Typography>
                        <Typography>Findings: {(data.findings || []).length} historical Finding record(s). Closure does not auto-close them.</Typography>
                    </Surface>
                </Stack>
            )}
        </QueryState>
    );
}
