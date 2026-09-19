import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { PageShell, SectionHeader } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';
import { formatShortDate } from '../utils/humanizeLabel';
import { useAuth } from '../contexts/AuthContext';

export default function ThirdPartyIntakeDetail() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [analystId, setAnalystId] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [note, setNote] = useState('');
    const [infoNote, setInfoNote] = useState('');
    const [response, setResponse] = useState('');
    const [search, setSearch] = useState('');
    const [matches, setMatches] = useState<any[]>([]);
    const [analysts, setAnalysts] = useState<Array<{ id: string; name: string }>>([]);

    const load = () => {
        setLoading(true);
        Promise.all([intakeAPI.get(id), intakeAPI.myWork().catch(() => ({ data: { data: { analysts: [] } } }))])
            .then(([detail, work]) => {
                setData(detail.data.data);
                setAnalysts(work.data.data.analysts || []);
                setError(null);
            })
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to load intake.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [id]);

    const run = async (label: string, fn: () => Promise<any>, success: string) => {
        setPending(label);
        setMessage(null);
        setError(null);
        try {
            const result = await fn();
            setData(result.data.data.intake || result.data.data);
            if (result.data.data.engagement) {
                setMessage(`${success} ${result.data.data.engagement.publicId}`);
            } else {
                setMessage(success);
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || err.message || 'Action failed.');
        } finally {
            setPending('');
        }
    };

    const facts = data?.routingFacts || {};

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'Intake', to: '/third-parties/intake' }, { label: data?.publicId || 'Request' }]}
                title={data ? `${data.publicId} · ${data.proposedThirdPartyName}` : 'Intake'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.statusLabel} /> : undefined}
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Intake not found" emptyBody="Return to the intake queue.">
                {data && (
                    <Stack spacing={2} sx={{ minWidth: 0 }}>
                        <Surface>
                            <SectionHeader title="What is requested" />
                            <Typography>Proposed third party: {data.proposedThirdPartyName}</Typography>
                            <Typography>Service: {data.proposedServiceName}</Typography>
                            <Typography>Why: {data.businessPurpose}</Typography>
                            <Typography>When: {data.targetStartDate ? formatShortDate(data.targetStartDate) : 'Not recorded'}</Typography>
                            <Typography>Who requested it: {data.requesterName} · {data.requesterEmail} · {data.requesterBusinessUnit || 'No unit recorded'}</Typography>
                            <Typography>Business owner: {data.businessOwnerName || 'Not recorded'}</Typography>
                            <Typography>Assigned: {data.assignedAnalystName || 'Unassigned'}{data.assignmentDueAt ? ` · due ${formatShortDate(data.assignmentDueAt)}` : ''}</Typography>
                            <Typography>Priority: {data.priority}</Typography>
                            <Typography>Needed next: {data.nextAction}</Typography>
                            {data.matchedThirdParty && <Typography>Matched third party: {data.matchedThirdParty.name}</Typography>}
                            {data.createdEngagement && (
                                <Button sx={{ mt: 1 }} onClick={() => navigate(`/third-parties/engagements/${data.createdEngagement.id}`)}>
                                    Open {data.createdEngagement.publicId}
                                </Button>
                            )}
                        </Surface>
                        <Surface>
                            <SectionHeader title="Initial routing answers" />
                            {Object.entries(facts).map(([key, value]) => (
                                <Typography key={key}>{key.replace(/([A-Z])/g, ' $1')}: {value ? 'Yes' : 'No'}</Typography>
                            ))}
                        </Surface>

                        {(data.status === 'UNASSIGNED' || data.status === 'SUBMITTED' || data.status === 'ASSIGNED' || data.status === 'IN_REVIEW') && analysts.length > 0 && (
                            <Surface>
                                <SectionHeader title="Assignment" />
                                <Stack spacing={1.5} sx={{ maxWidth: 480 }}>
                                    <TextField select label="Analyst" value={analystId} onChange={(event) => setAnalystId(event.target.value)}>
                                        {analysts.map((row) => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
                                    </TextField>
                                    <TextField type="date" label="Assignment due" InputLabelProps={{ shrink: true }} value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                                    <TextField label="Assignment note" value={note} onChange={(event) => setNote(event.target.value)} />
                                    <Button variant="contained" disabled={Boolean(pending) || !analystId} onClick={() => run('assign', () => intakeAPI.assign(data.id, { analystUserId: analystId, dueAt, note, priority: data.priority }), 'Assignment saved.')}>
                                        {pending === 'assign' ? 'Assigning…' : data.assignedAnalystUserId ? 'Reassign analyst' : 'Assign analyst'}
                                    </Button>
                                </Stack>
                            </Surface>
                        )}

                        {data.status === 'ASSIGNED' && data.assignedAnalystUserId === user?.id && (
                            <Button variant="contained" disabled={Boolean(pending)} onClick={() => run('review', () => intakeAPI.startReview(data.id), 'Review started.')}>
                                {pending === 'review' ? 'Starting…' : 'Start review'}
                            </Button>
                        )}

                        {data.status === 'NEEDS_INFORMATION' && (
                            <Surface>
                                <SectionHeader title="Action required" />
                                <Typography>GRC asked for more intake information. The original submission stays in history.</Typography>
                                <TextField sx={{ mt: 1 }} multiline minRows={3} label="Your response" value={response} onChange={(event) => setResponse(event.target.value)} />
                                <Button sx={{ mt: 1 }} variant="contained" disabled={Boolean(pending) || !response.trim()} onClick={() => run('respond', () => intakeAPI.respondInformation(data.id, { response }), 'Response received.')}>
                                    {pending === 'respond' ? 'Sending…' : 'Submit response'}
                                </Button>
                            </Surface>
                        )}

                        {(data.status === 'IN_REVIEW' || data.status === 'ASSIGNED') && (
                            <Surface>
                                <SectionHeader title="Need more business information" />
                                <TextField multiline minRows={2} label="What is missing?" value={infoNote} onChange={(event) => setInfoNote(event.target.value)} />
                                <Button sx={{ mt: 1 }} disabled={Boolean(pending) || !infoNote.trim()} onClick={() => run('info', () => intakeAPI.requestInformation(data.id, { note: infoNote, fields: ['other'] }), 'Information requested.')}>
                                    {pending === 'info' ? 'Requesting…' : 'Request more information'}
                                </Button>
                            </Surface>
                        )}

                        {(data.status === 'IN_REVIEW' || data.status === 'READY_FOR_MATCH' || data.status === 'VENDOR_MATCHED') && (
                            <Surface>
                                <SectionHeader title="Search third parties" />
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
                                    <TextField label="Search name, legal name, or domain" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ flex: 1, minWidth: 0 }} />
                                    <Button disabled={Boolean(pending)} onClick={async () => {
                                        setPending('search');
                                        setError(null);
                                        try {
                                            const found = await intakeAPI.searchThirdParties(data.id, { q: search || data.proposedThirdPartyName, website: data.vendorWebsite });
                                            setMatches(found.data.data || []);
                                            setMessage(found.data.data?.length ? 'Select a match. Nothing is confirmed automatically.' : 'No existing third party matched. You may create one.');
                                        } catch (err: any) {
                                            setError(err.response?.data?.error?.message || err.message || 'Search failed.');
                                        } finally {
                                            setPending('');
                                        }
                                    }}>{pending === 'search' ? 'Searching…' : 'Search third parties'}</Button>
                                </Stack>
                                {matches.map((row) => (
                                    <Stack key={row.id} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Typography sx={{ flex: 1 }}>{row.name} · {row.legalName || 'No legal name'} · {row.domain || row.website || 'No domain'} · {row.country || 'Country not recorded'} · {row.engagementCount} engagements · {row.status}</Typography>
                                        <Button disabled={Boolean(pending)} onClick={() => run('match', () => intakeAPI.match(data.id, { vendorId: row.id, reason: row.matchReason, candidates: matches }), 'Third party confirmed.')}>
                                            {pending === 'match' ? 'Confirming…' : 'Confirm match'}
                                        </Button>
                                    </Stack>
                                ))}
                                <Button sx={{ mt: 1 }} disabled={Boolean(pending)} onClick={() => run('create-vendor', () => intakeAPI.createThirdParty(data.id, { name: data.proposedThirdPartyName, website: data.vendorWebsite, acknowledgeDuplicate: false }), 'New third party created.')}>
                                    {pending === 'create-vendor' ? 'Creating…' : 'Create new third party'}
                                </Button>
                            </Surface>
                        )}

                        {data.status === 'VENDOR_MATCHED' && (
                            <Button variant="contained" disabled={Boolean(pending)} onClick={() => run('engagement', () => intakeAPI.createEngagement(data.id, { serviceName: data.proposedServiceName, businessPurpose: data.businessPurpose }), 'Engagement created.')}>
                                {pending === 'engagement' ? 'Creating…' : `Create engagement ${data.proposedServiceName}`}
                            </Button>
                        )}

                        <Surface>
                            <SectionHeader title="What happened over time" />
                            {(data.assignmentHistory || []).map((row: any) => (
                                <Typography key={row.id} variant="body2">
                                    Assigned {row.toAnalystName || row.toAnalystUserId} by {row.assignedByName || 'lead'} on {formatShortDate(row.assignedAt)}{row.note ? ` · ${row.note}` : ''}
                                </Typography>
                            ))}
                            {(data.informationRequests || []).map((row: any) => (
                                <Typography key={row.id} variant="body2">
                                    Information requested {formatShortDate(row.requestedAt)}: {row.requestNote}
                                    {row.response ? ` · Response ${formatShortDate(row.respondedAt)}: ${row.response}` : ''}
                                </Typography>
                            ))}
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
