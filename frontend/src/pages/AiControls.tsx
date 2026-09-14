import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function AiControls() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        aiGovernanceAPI.controls()
            .then((res) => setRows(res.data.data || []))
            .catch((err) => setError(err.message || 'Unable to load AI controls'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Controls' }]}
                title="AI controls"
                description="Mapped common controls. Do not duplicate an existing Supreme control. CLEAN evidence is not effectiveness."
            />
            <QueryState loading={loading} error={error} empty={false} emptyTitle="" emptyBody="">
                <Stack spacing={2.5}>
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>These are the existing common controls used by AI systems. Supreme does not invent a second control library.</Alert>
                        <AppTable
                            rows={rows}
                            rowKey={(row) => row.id}
                            onRowClick={(row) => navigate(`/control-center/${row.id}`)}
                            emptyTitle="No AI-mapped controls"
                            emptyBody="Adopt AIG controls from the common catalog or link an existing control to an AI system."
                            columns={[
                                { id: 'key', label: 'Control', render: (row) => row.controlKey },
                                { id: 'title', label: 'Title', render: (row) => row.title },
                                { id: 'impl', label: 'Implementation', render: (row) => humanizeLabel(row.implementationStatus) },
                                { id: 'eff', label: 'Effectiveness', render: (row) => humanizeLabel(row.effectivenessStatus) },
                                { id: 'test', label: 'Latest test', render: (row) => humanizeLabel(row.latestTest?.result) },
                                { id: 'ev', label: 'CLEAN evidence', render: (row) => (row.cleanEvidence || []).map((item: any) => item.filename).join(', ') || 'None' },
                                { id: 'req', label: 'Requirements', render: (row) => (row.relatedRequirements || []).map((item: any) => item.requirementKey).join(', ') || 'None' },
                                { id: 'sys', label: 'AI systems', render: (row) => (row.relatedSystems || []).map((item: any) => item.publicId).join(', ') || 'None' },
                            ]}
                        />
                    </Surface>
                    {rows.map((row) => (
                        <Surface key={`${row.id}-detail`}>
                            <Typography variant="h6">{row.controlKey}  {row.title}</Typography>
                            <Typography sx={{ my: 1 }}>{row.honesty}</Typography>
                            <Typography>Related findings: {(row.relatedFindings || []).length || 'None recorded'}</Typography>
                            <AppTable
                                rows={row.cleanEvidence || []}
                                rowKey={(item: any) => item.id}
                                emptyTitle="No CLEAN evidence"
                                emptyBody="Pending or unscanned objects are not supporting evidence."
                                columns={[
                                    { id: 'file', label: 'Filename', render: (item: any) => item.filename },
                                    { id: 'fresh', label: 'Freshness', render: (item: any) => humanizeLabel(item.freshness) },
                                    { id: 'rel', label: 'Relation', render: (item: any) => humanizeLabel(item.relationship) },
                                ]}
                            />
                        </Surface>
                    ))}
                </Stack>
            </QueryState>
        </>
    );
}
