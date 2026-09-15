import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { intelligenceAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';

export default function IntelligenceExecutive() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        intelligenceAPI.executive()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load executive intelligence'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Intelligence', to: '/intelligence' }, { label: 'Executive' }]}
                title="Executive intelligence"
                description="Material change, appetite, decisions, and cross-platform impact. Operational noise stays out of this view."
                actions={<Button onClick={() => intelligenceAPI.downloadReport('brief').then((res) => downloadBinaryResponse(res, 'Supreme-Intelligence-Brief.pdf'))}>Intelligence brief</Button>}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Executive intelligence" emptyBody="No invented board metrics.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Typography variant="body2">{data.period?.label || 'Trend not yet established'}</Typography>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Leadership attention</Typography>
                            <AppTable
                                rows={data.executive || []}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="Nothing for leadership"
                                emptyBody="Only recorded material conditions appear here."
                                onRowClick={(row: any) => navigate(row.href)}
                                columns={[
                                    { id: 'id', label: 'Item', render: (row: any) => row.publicId },
                                    { id: 'title', label: 'What changed', render: (row: any) => row.title },
                                    { id: 'why', label: 'Why it matters', render: (row: any) => row.whyItMatters },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>Decisions overdue or waiting</Typography>
                            <AppTable
                                rows={data.decisionsToWatch || []}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No decisions waiting"
                                emptyBody="Intelligence cannot make these decisions."
                                onRowClick={(row: any) => navigate(row.href)}
                                columns={[
                                    { id: 'id', label: 'Item', render: (row: any) => row.publicId },
                                    { id: 'title', label: 'Decision', render: (row: any) => row.title },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>What improved</Typography>
                            <AppTable
                                rows={data.positiveMovement || []}
                                rowKey={(row: any) => row.publicId}
                                emptyTitle="No recorded improvement"
                                emptyBody="Positive movement is shown only when a source record improved."
                                onRowClick={(row: any) => navigate(row.href)}
                                columns={[
                                    { id: 'id', label: 'Item', render: (row: any) => row.publicId },
                                    { id: 'title', label: 'Change', render: (row: any) => row.title },
                                ]}
                            />
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
