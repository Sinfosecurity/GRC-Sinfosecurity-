import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { intakeAPI } from '../services/api';

export default function EngagementResidual() {
    const { id = '' } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmNote, setConfirmNote] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getEngagementRisk(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load residual risk.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const run = async (work: () => Promise<any>, success: string) => {
        setBusy(true);
        setError(null);
        try {
            await work();
            setMessage(success);
            load();
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The residual action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Residual risk not available" emptyBody="Confirm inherent tier and control effectiveness first.">
            {data && (
                <Stack spacing={2}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                    <Surface>
                        <Typography><strong>Confirmed inherent tier:</strong> {data.confirmedInherent?.confirmedTier || 'Not yet assessed'}</Typography>
                        <Typography><strong>Inherent source:</strong> {data.confirmedInherent?.source || 'Not recorded'}</Typography>
                        <Typography><strong>Control effectiveness:</strong> {(data.controls || []).map((row: any) => `${row.controlTitle}: ${row.rating}`).join('; ') || 'Not assessed'}</Typography>
                        <Typography><strong>Confirmed open Findings:</strong> {(data.findings || []).length}</Typography>
                        <Typography><strong>Eligible compensating controls:</strong> {(data.compensating || []).filter((row: any) => row.consideredInResidual).length}</Typography>
                        <Typography><strong>Methodology:</strong> {data.methodology?.version || 'Not recorded'}</Typography>
                    </Surface>
                    <Surface>
                        {!data.residual && <Typography>{data.readiness?.blockers?.[0] || 'Residual risk not calculated'}</Typography>}
                        {data.residual && (
                            <Stack spacing={0.5}>
                                <Typography><strong>Result:</strong> {data.residual.residualBand} {data.residual.residualScore != null ? `(${data.residual.residualScore})` : ''}</Typography>
                                <Typography><strong>Drivers:</strong></Typography>
                                {(data.residual.factors || []).map((factor: any) => (
                                    <Typography key={factor.code} variant="body2">{factor.label}: {factor.points} — {factor.rationale}</Typography>
                                ))}
                                <Typography variant="caption">Calculated {data.residual.calculatedAt || 'not yet'} · {data.residual.methodologyVersion}</Typography>
                            </Stack>
                        )}
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.calculateResidual(id), 'Engagement residual risk calculated.')}>Calculate residual risk</Button>
                            <Button disabled={busy || !data.residual} onClick={() => run(() => intakeAPI.confirmResidual(id, { note: confirmNote }), 'Residual risk confirmed. Wave 5 is not started.')}>Confirm residual assessment</Button>
                        </Stack>
                        <TextField sx={{ mt: 1 }} label="Confirmation note" value={confirmNote} onChange={(event) => setConfirmNote(event.target.value)} fullWidth />
                    </Surface>
                    <Surface>
                        <Typography variant="h6">History</Typography>
                        {(data.history || []).map((row: any) => (
                            <Typography key={row.id} variant="body2">{String(row.createdAt || '').slice(0, 10)} · {row.residualBand || row.status} · {row.triggerReason}</Typography>
                        ))}
                        {!(data.history || []).length && <Typography variant="body2">Not recorded</Typography>}
                    </Surface>
                    <Typography variant="caption">Wave 5 treatment, acceptance, and contracting have not started. Residual risk remains Engagement-authoritative.</Typography>
                </Stack>
            )}
        </QueryState>
    );
}
