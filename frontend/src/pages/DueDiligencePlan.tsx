import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';
import { formatDateTime } from '../utils/humanizeLabel';

export default function DueDiligencePlan() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [exclude, setExclude] = useState<Record<string, boolean>>({});
    const [include, setInclude] = useState<Record<string, boolean>>({});
    const [reason, setReason] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [copied, setCopied] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getDueDiligence(id)
            .then((res) => {
                setData(res.data.data);
                setContactName(res.data.data.contact?.name || '');
                setContactEmail(res.data.data.contact?.email || '');
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load the due-diligence plan.'))
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
            if (res.data.data.activationUrl) setCopied(res.data.data.activationUrl);
            setContactName(res.data.data.contact?.name || contactName);
            setContactEmail(res.data.data.contact?.email || contactEmail);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'The action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const modify = (event: FormEvent) => {
        event.preventDefault();
        run(() => intakeAPI.modifyDueDiligence(id, {
            includeKeys: Object.entries(include).filter(([, on]) => on).map(([key]) => key),
            excludeKeys: Object.entries(exclude).filter(([, on]) => on).map(([key]) => key),
            reason,
        }), 'Plan updated. The original recommendation is preserved.');
    };

    return (
        <PageShell>
            <PageHeader
                crumbs={[
                    { label: 'Third Parties', to: '/vendor-management' },
                    { label: data?.engagement?.publicId || 'Engagement', to: `/third-parties/engagements/${id}` },
                    { label: 'Due diligence' },
                ]}
                title={data ? `Due-diligence scope · ${data.what}` : 'Due-diligence scope'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.stateLabel} /> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Plan not found" emptyBody="Confirm the inherent tier first.">
                {data && (
                    <Stack spacing={2}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                        <Surface>
                            <Typography><strong>What:</strong> {data.what}</Typography>
                            <Typography><strong>Why:</strong> {data.why}</Typography>
                            <Typography><strong>Source:</strong> {data.source}</Typography>
                            <Typography><strong>Confirmed tier:</strong> {data.confirmedTier}</Typography>
                            <Typography><strong>Third party:</strong> {data.thirdParty?.name}</Typography>
                            <Typography><strong>Due date:</strong> {data.dueDate ? formatDateTime(data.dueDate) : 'Not set'}</Typography>
                            <Typography><strong>Next:</strong> {data.nextAction}</Typography>
                            {data.sendBlocked && <Alert severity="warning">{data.sendBlockMessage || 'Scope requires review.'}</Alert>}
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1 }}>Recommended packs</Typography>
                            {(data.packs || []).map((pack: any) => (
                                <Stack key={pack.key} direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1 }}>
                                    {pack.overridable && data.state !== 'AWAITING_VENDOR' && data.state !== 'VENDOR_IN_PROGRESS' && (
                                        <FormControlLabel
                                            control={<Checkbox
                                                checked={pack.status === 'EXCLUDED' ? Boolean(include[pack.key]) : Boolean(exclude[pack.key])}
                                                onChange={(event) => pack.status === 'EXCLUDED'
                                                    ? setInclude({ ...include, [pack.key]: event.target.checked })
                                                    : setExclude({ ...exclude, [pack.key]: event.target.checked })}
                                            />}
                                            label={pack.status === 'EXCLUDED' ? 'Include' : 'Exclude'}
                                        />
                                    )}
                                    <Stack>
                                        <Typography><strong>{pack.name}</strong> · {pack.status === 'EXCLUDED' ? 'Not included' : 'Included'}</Typography>
                                        <Typography variant="body2">Why included: {pack.why}</Typography>
                                        <Typography variant="body2">Reviewer domain: {pack.reviewerDomain}</Typography>
                                        <Typography variant="body2">Evidence expected: {pack.evidenceExpected}</Typography>
                                    </Stack>
                                </Stack>
                            ))}
                            {data.state !== 'AWAITING_VENDOR' && data.state !== 'VENDOR_IN_PROGRESS' && (
                                <Stack component="form" onSubmit={modify} spacing={1} sx={{ mt: 2 }}>
                                    <TextField label="Rationale for scope change" inputProps={{ 'aria-label': 'Rationale for scope change' }} value={reason} onChange={(event) => setReason(event.target.value)} required={Object.values(exclude).some(Boolean) || Object.values(include).some(Boolean)} />
                                    <Button type="submit" disabled={busy}>Apply scope change</Button>
                                </Stack>
                            )}
                            {data.changeReason && <Typography sx={{ mt: 1 }}>Change reason: {data.changeReason}</Typography>}
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Vendor contact</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                                <TextField label="Name" value={contactName} onChange={(event) => setContactName(event.target.value)} />
                                <TextField label="Email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
                                <Button disabled={busy} onClick={() => run(() => intakeAPI.setAssessmentContact(id, { name: contactName, email: contactEmail }), 'Vendor contact saved.')}>Save contact</Button>
                            </Stack>
                        </Surface>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                            {data.state === 'DUE_DILIGENCE_PLANNING' || data.state === 'INHERENT_TIER_CONFIRMED' ? (
                                <Button disabled={busy || data.sendBlocked} onClick={() => run(() => intakeAPI.confirmDueDiligence(id), 'Plan confirmed. Questionnaire is ready to send.')}>Confirm recommended plan</Button>
                            ) : null}
                            {data.state === 'READY_TO_SEND' || data.state === 'AWAITING_VENDOR' ? (
                                <>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.sendQuestionnaire(id, { name: contactName, email: contactEmail }), 'Questionnaire email queued. Accepted is not delivered.')}>Send questionnaire</Button>
                                    <Button disabled={busy} onClick={() => run(() => intakeAPI.copyActivationLink(id, { name: contactName, email: contactEmail }), 'Link copied. This is not sent.')}>Copy activation link</Button>
                                    {data.invitation?.copiedNotSent && data.state === 'READY_TO_SEND' && (
                                        <Button disabled={busy} onClick={() => run(() => intakeAPI.markInvitationShared(id), 'Marked as sent. The engagement is now awaiting the vendor.')}>Mark as sent</Button>
                                    )}
                                </>
                            ) : null}
                            {(data.state === 'VENDOR_SUBMITTED' || data.state === 'SPECIALIST_REVIEW') && (
                                <Button onClick={() => navigate(`/third-parties/engagements/${id}/assessment-review`)}>Open specialist review</Button>
                            )}
                        </Stack>
                        {copied && <Alert severity="info">Activation link ready. Copy is not send.</Alert>}
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
