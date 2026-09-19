import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Alert, Stack, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import Surface from '../components/design/Surface';
import { PageShell } from '../components/experience/ExperienceKit';
import PageHeader from '../components/design/PageHeader';
import { intakeAPI } from '../services/api';
import { engagementHref } from '../engagement/engagementPaths';
import VendorOnboardingWorkspace from './VendorOnboardingWorkspace';

export default function LegacyOnboardRedirect() {
    const { id = '' } = useParams();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        intakeAPI.resolveLegacyOnboard(id)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to resolve this legacy onboarding link.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (!loading && data?.mode === 'redirect' && data.engagement?.id) {
        return <Navigate to={engagementHref(data.engagement.id)} replace />;
    }

    if (!loading && data?.mode === 'choose') {
        return (
            <PageShell>
                <PageHeader title="Legacy Onboard link" description={data.compatibility} />
                <Surface>
                    <Typography sx={{ mb: 1 }}>{data.vendor?.name} has more than one Engagement. An Engagement was not manufactured.</Typography>
                    <Stack spacing={1}>
                        {(data.engagements || []).map((row: any) => (
                            <Typography key={row.id} component="a" href={engagementHref(row.id)}>{row.publicId} · {row.serviceName}</Typography>
                        ))}
                    </Stack>
                </Surface>
            </PageShell>
        );
    }

    return (
        <QueryState loading={loading} error={error} empty={false}>
            {data?.mode === 'legacy' && (
                <Stack spacing={2}>
                    <Alert severity="info">{data.compatibility}</Alert>
                    <VendorOnboardingWorkspace />
                </Stack>
            )}
        </QueryState>
    );
}
