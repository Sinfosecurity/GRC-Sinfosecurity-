import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';
import { formatDateTime } from '../utils/humanizeLabel';

export default function TierReview() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [overrideTier, setOverrideTier] = useState('HIGH');
    const [overrideReason, setOverrideReason] = useState('');
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [generalNote, setGeneralNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        intakeAPI.getTierReview(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load Tier Review.'))
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
            setError(err.response?.data?.error?.message || 'The review action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const confirm = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.confirmTier(id, {}), 'Inherent tier confirmed. Due-diligence scoping is not started.');
    };

    const override = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.overrideTier(id, { tier: overrideTier, reason: overrideReason }), 'Override recorded. The original recommendation is preserved.');
    };

    const clarify = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.requestIraClarification(id, {
            questionKeys: Object.entries(selected).filter(([, on]) => on).map(([key]) => key),
            notes,
            generalNote,
        }), 'Clarification requested. Tier Review is paused.');
    };

    return (
        <PageShell>
            <PageHeader
                crumbs={[
                    { label: 'Third Parties', to: '/vendor-management' },
                    { label: data?.engagement?.publicId || 'Engagement', to: `/engagements/${id}` },
                    { label: 'Tier Review' },
                ]}
                title={data ? `Tier Review · ${data.what}` : 'Tier Review'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.stateLabel} /> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Tier Review not found" emptyBody="Return to the engagement.">
                {data && (
                    <Stack spacing={2}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                        <Surface>
                            <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>What is being reviewed</Typography>
                            <Typography>Third party: {data.thirdParty?.name}</Typography>
                            <Typography>Engagement: {data.engagement?.publicId} · {data.engagement?.serviceName}</Typography>
                            <Typography>Requester: {data.requester?.name} · {data.requester?.email}</Typography>
                            <Typography>Business purpose: {data.engagement?.businessPurpose}</Typography>
                            <Typography>Submitted: {data.submittedAt ? formatDateTime(data.submittedAt) : 'Not submitted'}</Typography>
                            <Typography>Scoring: Version {data.scoringVersion} deterministic IRA. AI did not set this tier.</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>Why this tier is recommended</Typography>
                            <Typography>Recommended: {data.recommendedTier || 'Not yet rated'}</Typography>
                            <Typography>{data.explanation}</Typography>
                            <Typography sx={{ mt: 1 }}>Don't know items: {(data.unknownKeys || []).join(', ') || 'None'}</Typography>
                            {data.impactDelta && (
                                <Typography sx={{ mt: 1 }}>
                                    Previous recommendation: {data.impactDelta.previousRecommendation || 'None'} → Updated: {data.impactDelta.updatedRecommendation || 'None'}
                                    {data.impactDelta.changedFloors?.length ? ` · Changed floors: ${data.impactDelta.changedFloors.join(', ')}` : ''}
                                    {data.impactDelta.changedPacks?.length ? ` · Changed packs: ${data.impactDelta.changedPacks.join(', ')}` : ''}
                                </Typography>
                            )}
                        </Surface>
                        <Surface>
                            <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>IRA answers</Typography>
                            <Stack spacing={1}>
                                {(data.questions || []).map((question: any) => (
                                    <Typography key={question.key}>
                                        <strong>{question.key}.</strong> {question.question} — {question.answerLabel || 'Not recorded'}
                                        {question.dontKnow ? ' (Don\'t know)' : ''}
                                    </Typography>
                                ))}
                            </Stack>
                        </Surface>
                        <Surface>
                            <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>Floors and packs</Typography>
                            {(data.floors || []).filter((floor: any) => floor.applies).map((floor: any) => (
                                <Typography key={floor.code}>{floor.label}: {floor.tier} — {floor.rationale}</Typography>
                            ))}
                            {(data.packs?.packs || []).filter((pack: any) => pack.state !== 'EXCLUDED').map((pack: any) => (
                                <Typography key={pack.key}>{pack.key}: {pack.state}{pack.reason ? ` — ${pack.reason}` : ''}</Typography>
                            ))}
                            <Typography sx={{ mt: 1 }}>Next wave: due-diligence scoping is not started.</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>History</Typography>
                            {(data.history?.clarifications || []).map((item: any) => (
                                <Typography key={item.id}>
                                    Round {item.round}: {item.question} · Previous {item.previousAnswer || '—'} · Updated {item.updatedAnswer || 'waiting'} · {item.analystNote}
                                </Typography>
                            ))}
                            {data.history?.confirmedTier && (
                                <Typography>
                                    Recommended: {data.recommendedTier}. {data.history.overrideFromTier ? `Overridden: ${data.history.confirmedTier} by reviewer. Reason: ${data.history.overrideReason}` : `Confirmed: ${data.history.confirmedTier}`}
                                </Typography>
                            )}
                        </Surface>
                        {data.state !== 'CONFIRMED' && data.state !== 'NEEDS_CLARIFICATION' && (
                            <>
                                <Surface>
                                    <Stack component="form" onSubmit={confirm} spacing={1}>
                                    <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>Confirm tier</Typography>
                                    <Button type="submit" variant="contained" disabled={busy || !data.recommendedTier}>Confirm recommended tier</Button>
                                    </Stack>
                                </Surface>
                                <Surface>
                                    <Stack component="form" onSubmit={override} spacing={1.5} sx={{ maxWidth: 420 }}>
                                    <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>Override tier</Typography>
                                        <TextField select label="New tier" value={overrideTier} onChange={(event) => setOverrideTier(event.target.value)}>
                                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((tier) => <MenuItem key={tier} value={tier}>{tier}</MenuItem>)}
                                        </TextField>
                                        <TextField required label="Mandatory rationale" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} multiline minRows={3} />
                                        <Button type="submit" disabled={busy || overrideReason.trim().length < 8}>Override and record rationale</Button>
                                    </Stack>
                                </Surface>
                                <Surface>
                                    <Stack component="form" onSubmit={clarify} spacing={1}>
                                    <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>Request clarification</Typography>
                                    <TextField label="General note" value={generalNote} onChange={(event) => setGeneralNote(event.target.value)} fullWidth sx={{ mb: 1 }} />
                                    {(data.questions || []).map((question: any) => (
                                        <Stack key={question.key} sx={{ mb: 1 }}>
                                            <FormControlLabel
                                                control={<Checkbox checked={Boolean(selected[question.key])} onChange={(event) => setSelected((current) => ({ ...current, [question.key]: event.target.checked }))} />}
                                                label={`${question.key} · ${question.question}`}
                                            />
                                            {selected[question.key] && (
                                                <TextField
                                                    label="Clarification question"
                                                    value={notes[question.key] || ''}
                                                    onChange={(event) => setNotes((current) => ({ ...current, [question.key]: event.target.value }))}
                                                />
                                            )}
                                        </Stack>
                                    ))}
                                    <Button type="submit" disabled={busy || !Object.values(selected).some(Boolean)}>Request clarification</Button>
                                    </Stack>
                                </Surface>
                            </>
                        )}
                        <Button onClick={() => navigate(`/engagements/${id}`)}>Back to engagement</Button>
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
