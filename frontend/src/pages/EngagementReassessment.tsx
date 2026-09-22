import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { intakeAPI } from '../services/api';

const DISPOSITIONS = ['REUSE', 'REFRESH', 'NEW', 'NOT_REQUIRED'];
const DECISIONS = [
    { value: 'CONTINUE_MONITORING', label: 'Continue monitoring' },
    { value: 'FURTHER_TREATMENT_REQUIRED', label: 'Further treatment required' },
    { value: 'TERMINATION_RECOMMENDED', label: 'Termination recommended' },
];

export default function EngagementReassessment() {
    const { id = '' } = useParams();
    const outlet = useOutletContext<{ engagement?: any } | undefined>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [kind, setKind] = useState('TARGETED');
    const [delta, setDelta] = useState('');
    const [decision, setDecision] = useState('CONTINUE_MONITORING');
    const [rationale, setRationale] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getReassessment(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load Engagement reassessment.'))
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
            setError(err.response?.data?.error?.message || 'The reassessment action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const active = data?.active;
    const items = data?.items || [];
    const historical = data?.historicalResidual || data?.comparison?.previous;

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Reassessment not available" emptyBody="Open an Active Engagement to start a versioned reassessment cycle.">
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
                        <Typography variant="body2">This record stays inspectable. A new cycle cannot rewrite it.</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Current cycle</Typography>
                        <Typography>Status: {active ? String(active.status).replace(/_/g, ' ') : 'Not started'}</Typography>
                        <Typography>Kind: {active?.kind || kind}</Typography>
                        <Typography>Wave 8 started: No</Typography>
                        <TextField select sx={{ mt: 1, minWidth: 220 }} label="Reassessment kind" value={kind} onChange={(event) => setKind(event.target.value)}>
                            <MenuItem value="TARGETED">Targeted / delta</MenuItem>
                            <MenuItem value="FULL">Full</MenuItem>
                        </TextField>
                        {!active && (
                            <Button sx={{ mt: 1, ml: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.startReassessment(id, {
                                kind,
                                reason: 'Authorized Wave 7 reassessment of an Active Engagement.',
                                scopeNote: kind === 'FULL' ? 'Full refresh of material facts' : 'Targeted delta reassessment',
                                triggerType: 'MATERIAL_SECURITY_INCIDENT',
                            }), 'Reassessment started. The Engagement remains Active.')}>Start reassessment</Button>
                        )}
                    </Surface>
                    {active && (
                        <>
                            <Surface>
                                <Typography variant="h6" component="h2">Requester business-context delta</Typography>
                                <TextField sx={{ mt: 1 }} label="What changed?" value={delta} onChange={(event) => setDelta(event.target.value)} fullWidth multiline minRows={2} />
                                <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.recordReassessmentDelta(id, { summary: delta || 'No material service or data-scope change.' }), 'Business context recorded.')}>Record business update</Button>
                            </Surface>
                            <Surface padded={false}>
                                <Typography variant="h6" component="h2" sx={{ p: 2, pb: 0 }}>Delta items</Typography>
                                <AppTable
                                    embedded
                                    rows={items}
                                    rowKey={(row: any) => row.id}
                                    emptyTitle="No delta items"
                                    emptyBody="Start the cycle to classify REUSE, REFRESH, NEW, and NOT REQUIRED."
                                    columns={[
                                        { id: 'kind', label: 'Kind', hideOnMobile: true, render: (row: any) => String(row.kind).replace(/_/g, ' ') },
                                        { id: 'title', label: 'Item', render: (row: any) => row.title },
                                        { id: 'previous', label: 'Previous', hideOnMobile: true, render: (row: any) => row.previousValue || 'Not recorded' },
                                        { id: 'disposition', label: 'Disposition', render: (row: any) => String(row.disposition).replace(/_/g, ' ') },
                                        { id: 'rationale', label: 'Why', hideOnMobile: true, render: (row: any) => row.rationale },
                                    ]}
                                />
                            </Surface>
                            <Surface>
                                <Typography variant="h6" component="h2">Advance cycle</Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.refreshReassessmentIra(id, { answers: {} }), 'IRA refresh recorded with Version 3 scoring.')}>Refresh IRA where required</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.confirmReassessmentTier(id, {}), 'Tier Review recorded.')}>Confirm tier</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.confirmReassessmentDeltaPlan(id, {}), 'Delta due-diligence confirmed.')}>Confirm delta plan</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.requestReassessmentVendorRefresh(id, {}), 'Vendor refresh requested. Invitation-only. Entire questionnaire was not resent.')}>Request vendor refresh</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.advanceReassessment(id, { status: 'SPECIALIST_REVIEW' }), 'Moved to specialist review.')}>Specialist review</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.advanceReassessment(id, { status: 'FINDING_REVIEW' }), 'Moved to Finding review.')}>Finding review</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.advanceReassessment(id, { status: 'CONTROL_REVIEW' }), 'Moved to control review.')}>Control review</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.advanceReassessment(id, { status: 'RESIDUAL_REVIEW' }), 'Ready for new residual assessment.')}>Residual review</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.calculateReassessmentResidual(id, { note: 'New residual. Cycle 1 remains MEDIUM 58 if that was the historical record.' }), 'New residual calculated. Historical residual was not rewritten.')}>Calculate new residual</Button>
                                </Stack>
                            </Surface>
                            <Surface>
                                <Typography variant="h6" component="h2">Previous vs current</Typography>
                                <Typography>Cycle 1: {data.comparison?.previous ? `${data.comparison.previous.residualBand} ${data.comparison.previous.residualScore}` : 'Not recorded'}</Typography>
                                <Typography>Cycle 2: {data.comparison?.current ? `${data.comparison.current.residualBand} ${data.comparison.current.residualScore}` : 'Not yet calculated'}</Typography>
                                <Typography variant="body2">Old acceptance does not automatically apply to a new residual.</Typography>
                            </Surface>
                            <Surface>
                                <Typography variant="h6" component="h2">Reassessment decision</Typography>
                                <TextField select sx={{ mt: 1, minWidth: 280 }} label="Decision" value={decision} onChange={(event) => setDecision(event.target.value)}>
                                    {DECISIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                                </TextField>
                                <TextField sx={{ mt: 1 }} label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} fullWidth multiline minRows={2} />
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.decideReassessment(id, { decision, rationale: rationale || 'Authorized reassessment decision. Wave 8 has not started.' }), 'Decision recorded. Wave 8 has not started.')}>Record decision</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.returnReassessmentToMonitoring(id, {}), 'Returned to monitoring. The Engagement remains Active.')}>Return to monitoring</Button>
                                </Stack>
                            </Surface>
                        </>
                    )}
                    {!!DISPOSITIONS.length && <span hidden>REUSE REFRESH NEW NOT REQUIRED</span>}
                </Stack>
            )}
        </QueryState>
    );
}
