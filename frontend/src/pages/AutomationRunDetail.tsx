import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { automationAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function AutomationRunDetail() {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = () => {
        if (!publicId) return;
        automationAPI.execution(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load run'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [publicId]);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Automation', to: '/automation' }, { label: 'Runs', to: '/automation/runs' }, { label: publicId || 'Run' }]}
                title={data?.publicId || 'Execution'}
                description={data?.automationName || 'What Supreme did, and what a person must still do.'}
                actions={data?.willRetry ? (
                    <Button disabled={busy} onClick={async () => {
                        setBusy(true);
                        try {
                            await automationAPI.retry(publicId!);
                            load();
                        } catch (err: any) {
                            setError(err.message);
                        } finally {
                            setBusy(false);
                        }
                    }}>Retry notifications</Button>
                ) : undefined}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Run" emptyBody="This execution was not found in this organization.">
                {data && (
                    <Stack spacing={2.5}>
                        {data.preview && <Alert severity="warning">PREVIEW — NO ACTIONS EXECUTED</Alert>}
                        <StatusBadge value={data.status} kind="plain" />
                        <Surface>
                            <Typography variant="overline">What triggered this?</Typography>
                            <Typography>{humanizeLabel(data.whatTriggered)} on {data.sourceModel}</Typography>
                            <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>Which conditions matched?</Typography>
                            {(data.conditions || []).map((row: any) => (
                                <Typography key={row.field}>{humanizeLabel(row.field)}: {row.matched ? 'Matched' : 'Did not match'} — {row.reason}</Typography>
                            ))}
                        </Surface>
                        <Surface>
                            <Typography variant="overline">What did Supreme do?</Typography>
                            {(data.whatSupremeDid || []).map((row: string) => <Typography key={row}>{humanizeLabel(row)}</Typography>)}
                            {!(data.whatSupremeDid || []).length && <Typography>No administrative actions ran.</Typography>}
                            <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>What did Supreme NOT do?</Typography>
                            {(data.whatSupremeDidNotDo || []).map((row: string) => <Typography key={row}>{row}</Typography>)}
                        </Surface>
                        <Surface>
                            <Typography variant="overline">Who needs to act next?</Typography>
                            <Typography>{data.whoNeedsToAct || 'A person on the source record'}</Typography>
                            <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>What failed?</Typography>
                            {(data.whatFailed || []).length ? (data.whatFailed || []).map((row: any) => (
                                <Typography key={row.type}>{humanizeLabel(row.type)}: {row.error}</Typography>
                            )) : <Typography>Nothing failed.</Typography>}
                            <Typography variant="overline" sx={{ display: 'block', mt: 2 }}>What will retry?</Typography>
                            <Typography>{data.willRetry ? 'Notification delivery can retry. Governance records are not duplicated.' : 'No retry is queued.'}</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>Timezone used: {data.timezoneUsed}. Version {data.version}.</Typography>
                            {data.automationPublicId && <Button sx={{ mt: 1.5 }} onClick={() => navigate(`/automation/${data.automationPublicId}`)}>Open automation</Button>}
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
