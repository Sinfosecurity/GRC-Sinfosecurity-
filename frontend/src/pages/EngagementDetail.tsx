import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { GuidedStageCard, PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';
import { formatShortDate } from '../utils/humanizeLabel';

export default function EngagementDetail() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [siblings, setSiblings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        intakeAPI.getEngagement(id)
            .then(async (res) => {
                setData(res.data.data);
                if (res.data.data.vendorId) {
                    const list = await intakeAPI.listEngagements({ vendorId: res.data.data.vendorId, pageSize: 50 });
                    setSiblings(list.data.data.items || []);
                }
            })
            .catch((err) => setError(err.response?.data?.error?.message || err.message || 'Unable to load engagement.'))
            .finally(() => setLoading(false));
    }, [id]);

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: data?.publicId || 'Engagement' }]}
                title={data ? `${data.publicId} · ${data.serviceName}` : 'Engagement'}
                description={data?.nextAction}
                meta={data ? <StatusBadge kind="plain" label={data.statusLabel} /> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!loading && !data} emptyTitle="Engagement not found" emptyBody="Return to Third Parties.">
                {data && (
                    <Stack spacing={2}>
                        <GuidedStageCard
                            stage={data.statusLabel || 'Engagement'}
                            status={data.statusLabel}
                            owner={data.assignedAnalystName || 'TPRM Analyst'}
                            next={data.nextAction}
                            primaryAction={data.nextAction}
                            onPrimary={['READY_FOR_IRA', 'IRA_IN_PROGRESS', 'NEEDS_REQUESTER_CLARIFICATION'].includes(data.status) ? undefined : () => {
                                if (['VENDOR_SUBMITTED', 'SPECIALIST_REVIEW'].includes(data.status)) navigate(`/third-parties/engagements/${data.id}/assessment-review`);
                                else if (['FINDING_REVIEW', 'RESIDUAL_READY'].includes(data.status)) navigate(`/third-parties/engagements/${data.id}/risk`);
                                else if (data.ira) navigate(`/third-parties/engagements/${data.id}/tier-review`);
                                else navigate(`/third-parties/engagements/${data.id}/due-diligence`);
                            }}
                        />
                        <Surface>
                            <Typography>Third party: {data.thirdParty?.name}</Typography>
                            <Typography>Service: {data.serviceName}</Typography>
                            <Typography>Who requested it: {data.requesterName || 'Not recorded'}</Typography>
                            <Typography>Business owner: {data.businessOwnerName || 'Not recorded'}</Typography>
                            <Typography>Assigned analyst: {data.assignedAnalystName || 'Not recorded'}</Typography>
                            <Typography>Originating intake: {data.originatingIntake?.publicId || 'Legacy / none'}</Typography>
                            <Typography>Lifecycle state: {data.statusLabel}</Typography>
                            <Typography>Next action: {data.nextAction}</Typography>
                            <Typography>Target start: {data.targetStartDate ? formatShortDate(data.targetStartDate) : 'Not recorded'}</Typography>
                            {data.legacyReviewRequired && <Typography>Legacy review required. The backfill did not guess missing service facts.</Typography>}
                            {data.originatingIntake && (
                                <Button sx={{ mt: 1 }} onClick={() => navigate(`/third-parties/intake/${data.originatingIntake.id}`)}>Open originating intake</Button>
                            )}
                            {data.vendorId && (
                                <Button onClick={() => navigate(`/vendor-management?vendorId=${data.vendorId}`)}>Open third party</Button>
                            )}
                            {data.ira && (
                                <Button onClick={() => navigate(`/third-parties/engagements/${data.id}/tier-review`)}>Open Tier Review</Button>
                            )}
                            {(data.dueDiligence || data.ira?.confirmedTier || ['INHERENT_TIER_CONFIRMED', 'DUE_DILIGENCE_PLANNING', 'READY_TO_SEND', 'AWAITING_VENDOR', 'VENDOR_IN_PROGRESS', 'VENDOR_SUBMITTED', 'SPECIALIST_REVIEW'].includes(data.status)) && (
                                <Button onClick={() => navigate(`/third-parties/engagements/${data.id}/due-diligence`)}>Review due-diligence scope</Button>
                            )}
                            {['VENDOR_SUBMITTED', 'SPECIALIST_REVIEW', 'FINDING_REVIEW', 'RESIDUAL_READY'].includes(data.status) && (
                                <Button onClick={() => navigate(`/third-parties/engagements/${data.id}/assessment-review`)}>Open specialist review</Button>
                            )}
                            {['SPECIALIST_REVIEW', 'FINDING_REVIEW', 'RESIDUAL_READY'].includes(data.status) && (
                                <Button onClick={() => navigate(`/third-parties/engagements/${data.id}/risk`)}>Open Engagement risk</Button>
                            )}
                            {data.risk && (
                                <Typography sx={{ mt: 1 }}>Residual: {data.risk.residual?.residualBand || (data.risk.residualReady ? 'Ready to calculate' : 'Not ready')} · {data.risk.nextAction}</Typography>
                            )}
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1 }}>Engagements for this third party</Typography>
                            {siblings.map((row) => (
                                <Typography key={row.id}>{row.publicId} · {row.serviceName} · {row.statusLabel}</Typography>
                            ))}
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </PageShell>
    );
}
