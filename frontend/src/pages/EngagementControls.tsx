import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { intakeAPI } from '../services/api';
import { engagementHref } from '../engagement/engagementPaths';

export default function EngagementControls() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
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
    const idempotencyKey = useRef(crypto.randomUUID());

    const load = () => {
        setLoading(true);
        intakeAPI.getEngagementRisk(id)
            .then((res) => {
                setData(res.data.data);
                const first = res.data.data.applicableControls?.[0];
                if (first && !controlId) setControlId(first.id || first.controlKey);
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load controls.'))
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
            setError(err.response?.data?.error?.message || 'The control action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Controls not available" emptyBody="Open this Engagement after due diligence.">
            {data && (
                <Stack spacing={2}>
                    {message && <Alert severity="success">{message}</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                    <Surface>
                        <Typography>Shared Control effectiveness is Engagement-specific. UNKNOWN / NOT_ASSESSED is not Effective. N/A requires rationale.</Typography>
                        {(data.applicableControls || data.controls || []).map((row: any) => (
                            <Typography key={row.id || row.controlId} variant="body2">
                                {row.title || row.controlTitle} · {row.domain} · {row.recorded?.rating || row.rating || 'NOT_ASSESSED'}
                            </Typography>
                        ))}
                        <Stack component="form" onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            run(() => intakeAPI.recordControlEffectiveness(id, { controlId, rating, rationale }), 'Control effectiveness recorded for this Engagement only.');
                        }} spacing={1} sx={{ mt: 1 }}>
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
                        <Stack component="form" onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            run(() => intakeAPI.recordCompensatingControl(id, {
                                description: compDescription,
                                owner: compOwner,
                                affectedControlId: controlId,
                                effectivenessJudgment: 'PARTIALLY_EFFECTIVE',
                                consideredInResidual: true,
                                idempotencyKey: idempotencyKey.current,
                            }), 'Compensating control recorded. A retry with the same key does not create a duplicate.');
                        }} spacing={1} sx={{ mt: 1 }}>
                            <TextField label="Description" value={compDescription} onChange={(event) => setCompDescription(event.target.value)} fullWidth />
                            <TextField label="Owner" value={compOwner} onChange={(event) => setCompOwner(event.target.value)} fullWidth />
                            <Button type="submit" disabled={busy || !compDescription}>Record compensating control</Button>
                        </Stack>
                    </Surface>
                    <Button onClick={() => navigate(engagementHref(id, '/residual-risk'))}>Continue to Residual Risk</Button>
                </Stack>
            )}
        </QueryState>
    );
}
