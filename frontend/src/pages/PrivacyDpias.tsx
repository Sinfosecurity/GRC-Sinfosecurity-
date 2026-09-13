import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI } from '../services/api';

const QUESTIONS = [
    { key: 'large_scale', label: 'Large-scale processing' },
    { key: 'sensitive_data', label: 'Sensitive or special-category data' },
    { key: 'systematic_monitoring', label: 'Systematic monitoring' },
    { key: 'new_technology', label: 'New technology' },
    { key: 'vulnerable_subjects', label: 'Vulnerable data subjects' },
    { key: 'automated_decision', label: 'Automated decision-making' },
    { key: 'cross_border', label: 'Cross-border processing' },
];

export default function PrivacyDpias() {
    const [rows, setRows] = useState<any[]>([]);
    const [title, setTitle] = useState('Claims platform privacy review');
    const [activityPublicId, setActivityPublicId] = useState('');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [advice, setAdvice] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        privacyAPI.dpias()
            .then((res) => setRows(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load DPIAs'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const create = (event: FormEvent) => {
        event.preventDefault();
        privacyAPI.createDpia({
            title,
            activityPublicId: activityPublicId || undefined,
            screening: QUESTIONS.map((item) => ({ key: item.key, answer: Boolean(answers[item.key]) })),
        }).then((res) => {
            setAdvice(res.data.data.advice);
            load();
        }).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'DPIAs' }]} title="DPIA / privacy assessments" description="Screening can recommend review. It does not say a DPIA is legally required." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>A completed DPIA is not a claim that GDPR is satisfied.</Alert>
                        {advice && <Alert severity="warning" sx={{ mb: 2 }}>{advice}</Alert>}
                        <Stack component="form" onSubmit={create} spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
                                <TextField label="Activity ID" value={activityPublicId} onChange={(event) => setActivityPublicId(event.target.value)} placeholder="PA-00001" />
                            </Stack>
                            {QUESTIONS.map((item) => (
                                <FormControlLabel key={item.key} control={<Switch checked={Boolean(answers[item.key])} onChange={(event) => setAnswers((current) => ({ ...current, [item.key]: event.target.checked }))} />} label={item.label} />
                            ))}
                            <Button type="submit" variant="contained">Record screening</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.publicId}
                            emptyTitle="No DPIAs"
                            emptyBody="Record a screening when a review may be needed."
                            columns={[
                                { id: 'publicId', label: 'DPIA', render: (row) => row.publicId },
                                { id: 'title', label: 'Title', render: (row) => row.title },
                                { id: 'status', label: 'Status', render: (row) => row.status },
                                { id: 'advice', label: 'Screening', render: (row) => row.advice },
                            ]}
                        />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
