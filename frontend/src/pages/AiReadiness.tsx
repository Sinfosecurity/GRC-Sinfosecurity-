import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

const KEYS: Record<string, string> = {
    'nist-ai-rmf': 'NIST_AI_RMF',
    'iso-42001': 'ISO_42001',
    NIST_AI_RMF: 'NIST_AI_RMF',
    ISO_42001: 'ISO_42001',
};

export default function AiReadiness() {
    const { frameworkKey = '' } = useParams();
    const navigate = useNavigate();
    const key = KEYS[frameworkKey] || frameworkKey;
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        aiGovernanceAPI.readiness(key)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load readiness'));
    }, [key]);

    return (
        <QueryState loading={!data && !error} error={error} empty={!data} emptyTitle="Readiness" emptyBody="This readiness view was not found.">
            {data && (
                <>
                    <PageHeader
                        crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: data.name }]}
                        title={`${data.name} readiness`}
                        description="Identifiers and original Supreme summaries only. This is not a certification or legal determination."
                    />
                    <Stack spacing={2.5}>
                        <Alert severity="warning">{data.honesty}</Alert>
                        <Surface>
                            <Typography>Framework: {data.name}</Typography>
                            <Typography>Version: {data.version}</Typography>
                            <Typography>Certified: No</Typography>
                            <Typography>Mapped: {data.coverage?.mapped ?? 0} / {data.coverage?.requirementCount ?? 0}</Typography>
                            <Typography>Implemented: {data.coverage?.implemented ?? 0}</Typography>
                            <Typography>Tested: {data.coverage?.tested ?? 0}</Typography>
                            <Typography>Gaps: {data.coverage?.gaps ?? 0}</Typography>
                            <Button sx={{ mt: 1.5 }} onClick={() => navigate('/compliance')}>Open Supreme Compliance</Button>
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>{key === 'NIST_AI_RMF' ? 'Govern / Map / Measure / Manage' : 'Mapped clauses'}</Typography>
                            <AppTable
                                rows={data.areas || []}
                                rowKey={(row: any) => row.key}
                                emptyTitle="No mapped requirements"
                                emptyBody="Activate the framework in Supreme Compliance to record applicability. The catalog still shows Supreme summaries."
                                columns={[
                                    { id: 'key', label: 'Area', render: (row: any) => row.key },
                                    { id: 'summary', label: 'Supreme summary', render: (row: any) => row.supremeSummary },
                                    { id: 'mapped', label: 'Mapped controls', render: (row: any) => row.mappedControls },
                                    { id: 'impl', label: 'Implemented', render: (row: any) => row.implementedControls },
                                    { id: 'tested', label: 'Tested', render: (row: any) => row.testedControls },
                                    { id: 'gap', label: 'Gap', render: (row: any) => row.gap ? 'Gap recorded' : 'Mapped' },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Compliance program</Typography>
                            {data.compliance ? (
                                <>
                                    <Typography>Activation: {data.compliance.activationPublicId}</Typography>
                                    <Typography>Exceptions: {(data.compliance.exceptions || []).length}</Typography>
                                    <AppTable
                                        rows={data.compliance.gaps || []}
                                        rowKey={(row: any) => row.publicId}
                                        emptyTitle="No recorded gaps"
                                        emptyBody="Gaps come from Supreme Compliance. None are invented."
                                        columns={[
                                            { id: 'id', label: 'Gap', render: (row: any) => row.publicId },
                                            { id: 'title', label: 'Title', render: (row: any) => row.title },
                                            { id: 'status', label: 'Status', render: (row: any) => humanizeLabel(row.status) },
                                        ]}
                                    />
                                </>
                            ) : (
                                <Typography sx={{ mt: 1 }}>No activation recorded. Catalog mapping is shown above. This is not an attestation.</Typography>
                            )}
                        </Surface>
                    </Stack>
                </>
            )}
        </QueryState>
    );
}
