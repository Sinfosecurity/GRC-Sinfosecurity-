import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { intelligenceAPI } from '../services/api';
import { humanizeLabel, formatDateTime } from '../utils/humanizeLabel';

export default function IntelligenceDetail() {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [narrative, setNarrative] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        intelligenceAPI.item(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load intelligence'))
            .finally(() => setLoading(false));
        intelligenceAPI.narrative(publicId)
            .then((res) => setNarrative(res.data.data))
            .catch(() => setNarrative(null));
    };

    useEffect(() => { load(); }, [publicId]);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Intelligence', to: '/intelligence' }, { label: publicId || 'Item' }]}
                title={data?.title || 'Intelligence'}
                description={data?.summary || 'Derived from a governed source record.'}
                actions={data?.current ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button onClick={() => intelligenceAPI.acknowledge(publicId!, { lifecycle: 'ACKNOWLEDGED' }).then(load)}>Acknowledge</Button>
                        <Button onClick={() => intelligenceAPI.acknowledge(publicId!, { lifecycle: 'UNDER_REVIEW' }).then(load)}>Mark under review</Button>
                    </Stack>
                ) : undefined}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Intelligence item" emptyBody="This item is not available in this organization.">
                {data && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">Facts, derived intelligence, and AI narrative are labeled separately. Acknowledging this item does not change the source record.</Alert>
                        <Surface>
                            <Typography variant="h6">What happened</Typography>
                            <Typography sx={{ mt: 1 }}>{data.whatHappened || data.summary}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{data.priorityLabel} · {humanizeLabel(data.lifecycle)} · {data.publicId}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Why it matters</Typography>
                            <Typography sx={{ mt: 1 }}>{data.whyItMatters}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Derived intelligence · rule {data.ruleId} {data.ruleVersion}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">What is affected</Typography>
                            <AppTable
                                rows={data.affected?.objects || []}
                                rowKey={(row: any) => `${row.type}-${row.id}`}
                                emptyTitle="No recorded relationships"
                                emptyBody="Graph impact is shown only from real edges. None were invented."
                                onRowClick={(row: any) => navigate(row.href)}
                                columns={[
                                    { id: 'type', label: 'Type', render: (row: any) => row.type },
                                    { id: 'label', label: 'Record', render: (row: any) => row.publicId || row.label },
                                ]}
                            />
                            {data.graph?.human?.length ? (
                                <Typography variant="body2" sx={{ mt: 1.5 }}>
                                    Graph impact: {data.graph.human.map((row: any) => `${row.count} ${humanizeLabel(row.type)}`).join(' · ')}
                                </Typography>
                            ) : (
                                <Typography variant="body2" sx={{ mt: 1.5 }}>{data.graph?.message || 'No recorded graph relationships for this source.'}</Typography>
                            )}
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Facts that support this</Typography>
                            <AppTable
                                rows={data.facts || []}
                                rowKey={(row: any) => row.label}
                                emptyTitle="No facts"
                                emptyBody="Facts are copied from authoritative records only."
                                columns={[
                                    { id: 'label', label: 'Fact', render: (row: any) => row.label },
                                    { id: 'value', label: 'Value', render: (row: any) => row.value },
                                    { id: 'kind', label: 'Authority', render: (row: any) => row.kind === 'FACT' ? 'Fact' : row.kind },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Provenance</Typography>
                            <Typography>Source: {data.sourceProduct}</Typography>
                            <Typography>Record: {data.sourcePublicId || data.sourceId}</Typography>
                            <Typography>Source time: {formatDateTime(data.sourceTimestamp)}</Typography>
                            <Typography>Generated: {formatDateTime(data.generatedAt)}</Typography>
                            <Typography>State: {humanizeLabel(data.lifecycle)}{data.current ? ' · Current' : ' · Historical'}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Timeline</Typography>
                            <AppTable
                                rows={data.timeline || []}
                                rowKey={(row: any) => `${row.eventType}-${row.createdAt}`}
                                emptyTitle="No history"
                                emptyBody="Generation and reconciliation are preserved."
                                columns={[
                                    { id: 'event', label: 'Event', render: (row: any) => humanizeLabel(row.eventType) },
                                    { id: 'summary', label: 'Summary', render: (row: any) => row.summary },
                                    { id: 'when', label: 'When', render: (row: any) => formatDateTime(row.createdAt) },
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Next review</Typography>
                            <Typography sx={{ mt: 1 }}>{data.nextReview || data.reviewGuidance}</Typography>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">Authoritative source</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                                {(data.links || []).map((link: any) => (
                                    <Button key={link.href} component={RouterLink} to={link.href}>{link.label}</Button>
                                ))}
                            </Stack>
                        </Surface>
                        <Surface>
                            <Typography variant="h6">AI narrative</Typography>
                            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>AI-generated narrative · never a fact or a decision</Typography>
                            <Typography>{narrative?.text || narrative?.message || 'AI narrative is not configured. Deterministic intelligence remains available.'}</Typography>
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </Box>
    );
}
