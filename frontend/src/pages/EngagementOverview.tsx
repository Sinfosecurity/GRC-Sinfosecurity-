import { useOutletContext } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import Surface from '../components/design/Surface';
import { formatShortDate } from '../utils/humanizeLabel';

export default function EngagementOverview() {
    const { engagement: data } = useOutletContext<{ engagement: any }>();

    return (
        <Stack spacing={2}>
            <Surface>
                <Typography variant="h6" sx={{ mb: 1 }}>Enterprise record</Typography>
                <Typography><strong>What:</strong> {data.what || `${data.publicId} · ${data.serviceName}`}</Typography>
                <Typography><strong>Why:</strong> {data.why || data.businessPurpose || 'Not recorded'}</Typography>
                <Typography><strong>Source:</strong> {data.source || (data.originatingIntake?.publicId ? `Intake ${data.originatingIntake.publicId}` : 'Legacy / none')}</Typography>
                <Typography><strong>State:</strong> {data.state || data.statusLabel}</Typography>
                <Typography><strong>Owner:</strong> {data.owner || data.assignedAnalystName || 'Not recorded'}</Typography>
                <Typography><strong>Impact:</strong> {data.impact || 'Not yet assessed'}</Typography>
                <Typography><strong>Evidence:</strong> {data.evidence || 'Not recorded'}</Typography>
                <Typography><strong>Relationships:</strong> Third Party {data.thirdParty?.name || 'Not recorded'} · Intake {data.originatingIntake?.publicId || 'Not recorded'}</Typography>
                <Typography><strong>Next action:</strong> {data.nextAction}</Typography>
                <Typography><strong>History:</strong> {(data.history || []).length ? `${data.history.length} recorded events` : 'Not recorded'}</Typography>
            </Surface>
            <Surface>
                <Typography variant="h6" sx={{ mb: 1 }}>Operating facts</Typography>
                <Typography>Service / relationship: {data.serviceName || 'Not recorded'}</Typography>
                <Typography>Third Party: {data.thirdParty?.name || 'Not recorded'}</Typography>
                <Typography>Internal owner: {data.businessOwnerName || data.requesterName || 'Not recorded'}</Typography>
                <Typography>Assigned analyst: {data.assignedAnalystName || 'Not recorded'}</Typography>
                <Typography>Lifecycle stage: {data.statusLabel}</Typography>
                <Typography>Next-action owner: {data.primaryAction?.owner || 'Not recorded'}</Typography>
                <Typography>Confirmed inherent tier: {data.confirmedInherentTier || 'Not yet assessed'}</Typography>
                <Typography>Due-diligence status: {data.dueDiligenceStatus || 'Not yet assessed'}</Typography>
                <Typography>Vendor assessment status: {data.vendorAssessmentStatus || 'Not yet assessed'}</Typography>
                <Typography>Confirmed open Findings: {data.openFindingsCount ?? 0}</Typography>
                <Typography>Residual risk: {data.residual || 'Not calculated'}</Typography>
                {data.monitoring && (
                    <>
                        <Typography>Monitoring profile: {data.monitoring.profileStatus}</Typography>
                        <Typography>Open monitoring signals: {data.monitoring.openSignals ?? 0}</Typography>
                        <Typography>High-priority signals: {data.monitoring.highPriority ?? 0}</Typography>
                        <Typography>Reassessment recommended: {data.monitoring.reassessmentRecommended ? 'Yes — Wave 7 has not started' : 'No'}</Typography>
                    </>
                )}
                <Typography>Target start: {data.targetStartDate ? formatShortDate(data.targetStartDate) : 'Not recorded'}</Typography>
                {data.legacyReviewRequired && <Typography>Legacy review required. Missing service facts were not guessed.</Typography>}
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {data.vendorId && <Button onClick={() => window.location.assign(`/vendor-management?vendorId=${data.vendorId}`)}>Open Third Party</Button>}
                    {data.originatingIntake && <Button onClick={() => window.location.assign(`/third-parties/intake/${data.originatingIntake.id}`)}>Open originating intake</Button>}
                </Stack>
            </Surface>
        </Stack>
    );
}
