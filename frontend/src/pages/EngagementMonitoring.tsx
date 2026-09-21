import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import StatusBadge from '../components/design/StatusBadge';
import { intakeAPI } from '../services/api';

const DOMAINS = ['CYBERSECURITY', 'PRIVACY', 'OPERATIONAL_RESILIENCE', 'FINANCIAL_VIABILITY', 'REGULATORY_COMPLIANCE', 'FOURTH_PARTY', 'BUSINESS_CONTINUITY', 'INSURANCE', 'AI_MODEL_DEPENDENCY'];
const SOURCES = ['MANUAL_OBSERVATION', 'INTERNAL_REVIEW', 'VENDOR_NOTIFICATION', 'SYSTEM_EVENT'];

export default function EngagementMonitoring() {
    const { id = '' } = useParams();
    const outlet = useOutletContext<{ engagement?: any } | undefined>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [whatMonitoring, setWhat] = useState('');
    const [whyMonitoring, setWhy] = useState('');
    const [domains, setDomains] = useState('CYBERSECURITY');
    const [source, setSource] = useState('MANUAL_OBSERVATION');
    const [summary, setSummary] = useState('');
    const [title, setTitle] = useState('');

    const load = () => {
        setLoading(true);
        intakeAPI.getMonitoring(id)
            .then((res) => {
                const next = res.data.data;
                setData(next);
                setWhat(next.profile?.whatMonitoring || '');
                setWhy(next.profile?.whyMonitoring || '');
                setDomains((next.profile?.enabledDomains || next.recommendedDomains || ['CYBERSECURITY']).join(','));
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load Engagement monitoring.'))
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
            setError(err.response?.data?.error?.message || 'The monitoring action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const profile = data?.profile;
    const signals = data?.signals || [];

    return (
        <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Monitoring not available" emptyBody="Activate the Engagement before configuring monitoring.">
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
                        <Typography variant="h6" component="h2">Monitoring profile</Typography>
                        <Typography><strong>Status:</strong> {profile?.status || 'Not configured'}</Typography>
                        <Typography><strong>Last review:</strong> {profile?.lastReviewedAt ? String(profile.lastReviewedAt).slice(0, 10) : 'Not recorded'}</Typography>
                        <Typography><strong>Next review:</strong> {profile?.nextReviewAt ? String(profile.nextReviewAt).slice(0, 10) : 'Not recorded'}</Typography>
                        <TextField sx={{ mt: 1 }} label="What are we monitoring?" value={whatMonitoring} onChange={(event) => setWhat(event.target.value)} fullWidth multiline minRows={2} />
                        <TextField sx={{ mt: 1 }} label="Why are we monitoring it?" value={whyMonitoring} onChange={(event) => setWhy(event.target.value)} fullWidth multiline minRows={2} />
                        <TextField sx={{ mt: 1 }} label="Domains" helperText="Comma-separated. Recommendation is not automatic authority." value={domains} onChange={(event) => setDomains(event.target.value)} fullWidth />
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.saveMonitoringProfile(id, {
                                whatMonitoring,
                                whyMonitoring,
                                enabledDomains: domains.split(',').map((item) => item.trim()).filter(Boolean),
                                enabledSources: SOURCES,
                            }), 'Monitoring profile saved.')}>Save draft</Button>
                            <Button disabled={busy} onClick={() => run(() => intakeAPI.saveMonitoringProfile(id, {
                                whatMonitoring,
                                whyMonitoring,
                                enabledDomains: domains.split(',').map((item) => item.trim()).filter(Boolean),
                                enabledSources: SOURCES,
                                activate: true,
                            }), 'Monitoring profile active.')}>Activate profile</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Source health</Typography>
                        {(data.sourceHealth || []).map((row: any) => (
                            <Typography key={`${row.label}-${row.status}`} variant="body2">{row.label} · {row.status.replace(/_/g, ' ')} — {row.honesty}</Typography>
                        ))}
                    </Surface>
                    <Surface>
                        <Typography variant="h6" component="h2">Record observation</Typography>
                        <TextField select sx={{ mt: 1, minWidth: 220 }} label="Source" value={source} onChange={(event) => setSource(event.target.value)}>
                            {SOURCES.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                        </TextField>
                        <TextField select sx={{ mt: 1, minWidth: 220, ml: { md: 1 } }} label="Domain" value={domains.split(',')[0] || 'CYBERSECURITY'} onChange={(event) => setDomains([event.target.value, ...domains.split(',').slice(1)].join(','))}>
                            {DOMAINS.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                        </TextField>
                        <TextField sx={{ mt: 1 }} label="Signal title" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
                        <TextField sx={{ mt: 1 }} label="What happened?" value={summary} onChange={(event) => setSummary(event.target.value)} fullWidth multiline minRows={2} />
                        <Button sx={{ mt: 1 }} disabled={busy} onClick={() => run(() => intakeAPI.createManualSignal({
                            vendorId: data.engagement.thirdParty.id,
                            engagementId: id,
                            sourceType: source,
                            domain: (domains.split(',')[0] || 'CYBERSECURITY'),
                            title: title || summary,
                            summary,
                            rationale: summary,
                            sourceSeverity: 'HIGH',
                        }).then(() => intakeAPI.getMonitoring(id)), 'Observation recorded. Residual risk is unchanged.')}>Record observation</Button>
                    </Surface>
                    <Surface padded={false}>
                        <Typography variant="h6" component="h2" sx={{ p: 2, pb: 0 }}>Signals</Typography>
                        <AppTable
                            embedded
                            rows={signals}
                            rowKey={(row: any) => row.id}
                            emptyTitle="No monitoring signals"
                            emptyBody="Recorded observations appear here. An empty list is not a healthy-score placeholder."
                            columns={[
                                { id: 'priority', label: 'Priority', render: (row: any) => <StatusBadge kind="severity" value={row.attentionPriority} /> },
                                { id: 'title', label: 'Signal', render: (row: any) => row.title },
                                { id: 'domain', label: 'Domain', hideOnMobile: true, render: (row: any) => String(row.domain).replace(/_/g, ' ') },
                                { id: 'source', label: 'Source', hideOnMobile: true, render: (row: any) => row.sourceProvider },
                                { id: 'age', label: 'Age', hideOnMobile: true, render: (row: any) => `${row.ageHours}h` },
                                { id: 'status', label: 'Status', render: (row: any) => String(row.status).replace(/_/g, ' ') },
                                { id: 'next', label: 'Next action', render: (row: any) => row.nextAction },
                            ]}
                            onRowClick={(row: any) => navigate(`/monitoring/signals/${row.id}`)}
                        />
                    </Surface>
                    {!!data.legacyVendorMonitoring?.length && (
                        <Surface>
                            <Typography variant="h6" component="h2">Legacy vendor monitoring</Typography>
                            {data.legacyVendorMonitoring.map((row: any) => (
                                <Typography key={row.id} variant="body2">{row.riskIndicator} · {row.riskLevel} — {row.honesty}</Typography>
                            ))}
                        </Surface>
                    )}
                </Stack>
            )}
        </QueryState>
    );
}
