import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

const DECISIONS = [
    { key: 'REVIEW_REQUIRED', label: 'Review required' },
    { key: 'ASSESSMENT_IN_PROGRESS', label: 'Assessment in progress' },
    { key: 'NOTIFICATION_DETERMINED_REQUIRED', label: 'Notification determined required' },
    { key: 'NOTIFICATION_DETERMINED_NOT_REQUIRED', label: 'Notification determined not required' },
    { key: 'CLOSED', label: 'Closed' },
];

export default function PrivacyIncidents() {
    const [rows, setRows] = useState<any[]>([]);
    const [title, setTitle] = useState('Claims privacy incident assessment');
    const [activityPublicId, setActivityPublicId] = useState('');
    const [riskPublicId, setRiskPublicId] = useState('RISK-00001');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        privacyAPI.incidents()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load privacy incidents'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createIncident({
            title,
            activityPublicId: activityPublicId || undefined,
            enterpriseRiskId: riskPublicId || undefined,
            notificationStatus: 'REVIEW_REQUIRED',
        }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Incidents' }]} title="Privacy incidents" description="Notification assessment on existing incident and risk records. Decisions stay human-authoritative." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>Notification assessment required is not an automatic duty to notify a regulator.</Alert>
                        <Stack component="form" onSubmit={create} direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
                            <TextField label="Activity ID" value={activityPublicId} onChange={(event) => setActivityPublicId(event.target.value)} placeholder="PA-00002" />
                            <TextField label="Linked risk" value={riskPublicId} onChange={(event) => setRiskPublicId(event.target.value)} />
                            <Button type="submit" variant="contained">Record assessment</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            emptyTitle="No privacy incident assessments"
                            emptyBody="Link an existing incident or risk when a privacy notification assessment is needed."
                            columns={[
                                { id: 'publicId', label: 'Assessment', render: (row) => row.publicId },
                                { id: 'title', label: 'Title', render: (row) => row.title },
                                { id: 'incident', label: 'Incident', render: (row) => row.incident },
                                { id: 'activities', label: 'Activities', render: (row) => (row.activities || []).join(', ') || 'Not linked' },
                                { id: 'data', label: 'Data', render: (row) => (row.dataCategories || []).join(', ') || 'Not recorded' },
                                { id: 'subjects', label: 'Subjects', render: (row) => (row.dataSubjects || []).join(', ') || 'Not recorded' },
                                { id: 'systems', label: 'Systems', render: (row) => (row.systems || []).join(', ') || 'Not recorded' },
                                { id: 'vendors', label: 'Vendors', render: (row) => (row.vendors || []).join(', ') || 'Not recorded' },
                                { id: 'jurisdictions', label: 'Jurisdictions', render: (row) => (row.jurisdictions || []).join(', ') || 'Not recorded' },
                                { id: 'risk', label: 'Privacy risk', render: (row) => row.privacyRisk },
                                { id: 'findings', label: 'Findings', render: (row) => row.findings },
                                { id: 'status', label: 'Notification assessment', render: (row) => row.notificationStatus },
                                { id: 'decision', label: 'Decision', render: (row) => row.decision },
                                { id: 'owner', label: 'Owner', render: (row) => row.owner },
                                { id: 'dates', label: 'Dates', render: (row) => [row.occurredAt ? `Occurred ${new Date(row.occurredAt).toLocaleDateString()}` : null, row.closedAt ? `Closed ${new Date(row.closedAt).toLocaleDateString()}` : null].filter(Boolean).join(' · ') || 'Not recorded' },
                                { id: 'decide', label: '', render: (row) => (
                                    <TextField select size="small" value="" onChange={(event) => privacyAPI.decideIncident(row.publicId, { notificationStatus: event.target.value, decision: 'Recorded organizational decision' }).then(load)} sx={{ minWidth: 240 }}>
                                        <MenuItem value="" disabled>Record decision</MenuItem>
                                        {DECISIONS.map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                    </TextField>
                                ) },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
