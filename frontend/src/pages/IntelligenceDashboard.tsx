import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { intelligenceAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';
import { humanizeLabel } from '../utils/humanizeLabel';

function ItemTable({ rows, emptyTitle, emptyBody }: { rows: any[]; emptyTitle: string; emptyBody: string }) {
    const navigate = useNavigate();
    return (
        <AppTable
            rows={rows}
            rowKey={(row: any) => row.publicId}
            emptyTitle={emptyTitle}
            emptyBody={emptyBody}
            onRowClick={(row: any) => navigate(row.href)}
            columns={[
                { id: 'priority', label: 'Priority', render: (row: any) => row.priorityLabel || humanizeLabel(row.priority) },
                { id: 'title', label: 'What happened', render: (row: any) => row.title },
                { id: 'why', label: 'Why it matters', render: (row: any) => row.whyItMatters, hideOnMobile: true },
                { id: 'id', label: 'Item', render: (row: any) => row.publicId, hideOnMobile: true },
            ]}
        />
    );
}

export default function IntelligenceDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        intelligenceAPI.workspace()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load Supreme Intelligence'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Intelligence' }, { label: 'Overview' }]}
                title="Supreme Intelligence"
                description="What materially changed, why it matters, what it affects, and what deserves review. Intelligence interprets. Humans decide."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button onClick={() => navigate('/intelligence/changes')}>What changed</Button>
                        <Button onClick={() => navigate('/intelligence/executive')}>Executive</Button>
                        <Button onClick={() => intelligenceAPI.downloadReport('brief').then((res) => downloadBinaryResponse(res, 'Supreme-Intelligence-Brief.pdf'))}>Intelligence brief</Button>
                    </Stack>
                )}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Intelligence" emptyBody="Nothing is invented. Intelligence appears when governed records support it.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Alert severity="warning">External intelligence: {data.externalIntelligence?.message}</Alert>
                        <Typography variant="body2">{data.period?.label || 'Trend not yet established'}</Typography>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Critical attention</Typography>
                            <ItemTable rows={data.criticalAttention || []} emptyTitle="No critical attention" emptyBody="No recorded condition currently requires critical attention." />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>What changed</Typography>
                            <ItemTable rows={data.whatChanged || []} emptyTitle="No material change" emptyBody="Intelligence does not surface every edit." />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Cross-platform impact</Typography>
                            <ItemTable rows={data.crossPlatform || []} emptyTitle="No connected impact" emptyBody="Impact is shown only when recorded relationships exist." />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Decisions to watch</Typography>
                            <ItemTable rows={data.decisionsToWatch || []} emptyTitle="No pending decisions" emptyBody="Intelligence cannot approve or reject these records." />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Positive movement</Typography>
                            <ItemTable rows={data.positiveMovement || []} emptyTitle="No positive movement" emptyBody="Praise is not generated. Closed findings and passing tests appear here when recorded." />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Evidence and control signals</Typography>
                            <ItemTable rows={data.evidenceAndControl || []} emptyTitle="No evidence or control signals" emptyBody="Signals come from recorded tests and evidence freshness only." />
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
