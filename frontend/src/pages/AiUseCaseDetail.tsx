import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { aiGovernanceAPI } from '../services/api';

export default function AiUseCaseDetail() {
    const { publicId = '' } = useParams();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        aiGovernanceAPI.useCase(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load use case'));
    }, [publicId]);

    return (
        <QueryState loading={!data && !error} error={error} empty={!data} emptyTitle="Use case" emptyBody="This use case was not found.">
            {data && (
                <>
                    <PageHeader
                        crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: data.system.publicId, to: `/ai-governance/systems/${data.system.publicId}` }, { label: data.publicId }]}
                        title={`${data.publicId}  ${data.name}`}
                        description="Should we continue using this AI for this purpose? Governance is per use case, not only per model."
                    />
                    <Stack spacing={2.5}>
                        <Alert severity="info">The same model can have different risk, approval, and oversight for each use.</Alert>
                        <Surface>
                            <Typography>Purpose: {data.purpose || 'Not recorded'}</Typography>
                            <Typography>Business process: {data.businessProcess || 'Not recorded'}</Typography>
                            <Typography>Decision influence: {data.decisionInfluence || 'Not recorded'}</Typography>
                            <Typography>Affected persons: {data.affectedPersons || 'Not recorded'}</Typography>
                            <Typography>Data: {data.dataSummary || 'Not recorded'}</Typography>
                            <Typography>Autonomy: {data.autonomy}</Typography>
                            <Typography>Organization class: {data.organizationClass}</Typography>
                            <Typography>Human oversight: {data.humanOversight || 'Not recorded'}</Typography>
                        </Surface>
                    </Stack>
                </>
            )}
        </QueryState>
    );
}
