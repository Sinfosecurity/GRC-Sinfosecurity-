import { FormEvent, useEffect, useState } from 'react';
import { Alert, Button, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function AiAssessments() {
    const [rows, setRows] = useState<any[]>([]);
    const [catalog, setCatalog] = useState<any>(null);
    const [systemPublicId, setSystemPublicId] = useState('');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = () => {
        Promise.all([aiGovernanceAPI.assessments(), aiGovernanceAPI.catalog()])
            .then(([list, cat]) => { setRows(list.data.data); setCatalog(cat.data.data); })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);
    const create = (event: FormEvent) => {
        event.preventDefault();
        aiGovernanceAPI.createAssessment({
            systemPublicId,
            answers: Object.entries(answers).map(([key, answer]) => ({ key, answer })),
        }).then(load).catch((err) => setError(err.message));
    };
    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Assessments' }]} title="AI impact assessments" description="Screening can recommend enhanced review. It does not say a system is legally prohibited." />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="warning" sx={{ mb: 2 }}>Do not treat a recorded assessment as an EU AI Act determination.</Alert>
                        <Stack component="form" onSubmit={create} spacing={1.5}>
                            <TextField label="AI system ID" value={systemPublicId} onChange={(event) => setSystemPublicId(event.target.value)} required placeholder="AI-00001" />
                            {(catalog?.screeningQuestions || []).map((question: any) => (
                                <FormControlLabel key={question.key} control={<Switch checked={Boolean(answers[question.key])} onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.checked }))} />} label={question.label} />
                            ))}
                            <Button type="submit" variant="contained">Record assessment</Button>
                        </Stack>
                    </Surface>
                    <Surface>
                        <AppTable rows={rows} rowKey={(row) => row.publicId} emptyTitle="No assessments" emptyBody="Record an assessment against a live AI system." columns={[
                            { id: 'id', label: 'Assessment', render: (row) => row.publicId },
                            { id: 'system', label: 'System', render: (row) => row.system?.publicId },
                            { id: 'rec', label: 'Recommendation', render: (row) => row.recommendation },
                            { id: 'decision', label: 'Decision', render: (row) => row.decision ? humanizeLabel(row.decision) : 'Review required' },
                        ]} />
                    </Surface>
                </Stack>
            </QueryState>
        </>
    );
}
