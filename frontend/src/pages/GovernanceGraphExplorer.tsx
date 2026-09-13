import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import StatusBadge from '../components/design/StatusBadge';
import MetricCard from '../components/design/MetricCard';
import QueryState from '../components/QueryState';
import { governanceAPI } from '../services/api';

const NODE_TYPES = ['', 'ORGANIZATION', 'VENDOR', 'ASSESSMENT', 'EVIDENCE', 'FINDING', 'REMEDIATION', 'RISK', 'DECISION', 'CONTRACT', 'CONTROL'];
const RELATIONSHIP_TYPES = ['', 'OWNS', 'USES', 'HAS_RISK', 'ASSESSED_BY', 'HAS_FINDING', 'REMEDIATED_BY', 'SUPPORTED_BY', 'APPLIES_TO', 'CONTROLLED_BY', 'MITIGATES'];
const STATUSES = ['', 'ACTIVE', 'ARCHIVED', 'TERMINATED', 'OFFBOARDING'];
const PROVENANCES = ['', 'SYSTEM', 'USER', 'IMPORT', 'ASSESSMENT', 'RULE'];

type GraphNode = {
    id: string;
    nodeType: string;
    displayLabel: string;
    status: string;
    sourceModel?: string;
    sourceId?: string;
    recordHref?: string | null;
};

type Relationship = {
    id: string;
    relationshipType: string;
    provenance: string;
    authority: string;
    fromNode: GraphNode;
    toNode: GraphNode;
};

type Summary = {
    nodeCount: number;
    relationshipCount: number;
    activeRelationshipCount: number;
    nodeCounts: Record<string, number>;
    relationshipCounts: Record<string, number>;
    orphanNodes: Array<{ id: string; nodeType: string }>;
    recentChanges: Relationship[];
};

export default function GovernanceGraphExplorer() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [q, setQ] = useState(searchParams.get('q') || '');
    const [nodeType, setNodeType] = useState(searchParams.get('nodeType') || '');
    const [relationshipType, setRelationshipType] = useState(searchParams.get('relationshipType') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [provenance, setProvenance] = useState(searchParams.get('provenance') || '');
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [selected, setSelected] = useState<GraphNode | null>(null);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [impactNodes, setImpactNodes] = useState<GraphNode[]>([]);
    const [lineageHops, setLineageHops] = useState<Array<{ depth: number; node: GraphNode; edge: Relationship }>>([]);

    const selectedId = selected?.id || searchParams.get('nodeId') || '';

    const load = async (nodeId?: string) => {
        setLoading(true);
        setError(null);
        try {
            await governanceAPI.backfill().catch(() => undefined);
            const [summaryRes, searchRes] = await Promise.all([
                governanceAPI.summary(),
                governanceAPI.search({ q, nodeType: nodeType || undefined, status: status || undefined }),
            ]);
            const nextNodes: GraphNode[] = searchRes.data.data?.nodes || [];
            setSummary(summaryRes.data.data);
            setNodes(nextNodes);
            const nextSelected = nextNodes.find((node) => node.id === nodeId) || nextNodes[0] || null;
            setSelected(nextSelected);
            if (nextSelected) {
                const [relRes, impactRes, lineageRes] = await Promise.all([
                    governanceAPI.relationships(nextSelected.id, {
                        relationshipType: relationshipType || undefined,
                    }),
                    governanceAPI.impact(nextSelected.id),
                    governanceAPI.lineage(nextSelected.id),
                ]);
                const rels: Relationship[] = relRes.data.data?.relationships || [];
                setRelationships(provenance ? rels.filter((row) => row.provenance === provenance) : rels);
                setImpactNodes(impactRes.data.data?.nodes || []);
                setLineageHops(lineageRes.data.data?.hops || []);
            } else {
                setRelationships([]);
                setImpactNodes([]);
                setLineageHops([]);
            }
        } catch (err: any) {
            setError(err.message || 'Unable to load the governance graph');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(searchParams.get('nodeId') || undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const visibleRelationships = useMemo(
        () => (relationshipType ? relationships.filter((row) => row.relationshipType === relationshipType) : relationships),
        [relationships, relationshipType]
    );

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                title="Governance Graph"
                description="Search proven relationships across this organization. Lists are the accessible source of truth — not a visual hairball."
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                <TextField label="Search" value={q} onChange={(event) => setQ(event.target.value)} sx={{ minWidth: 220, flex: 1 }} />
                <TextField select label="Node type" value={nodeType} onChange={(event) => setNodeType(event.target.value)} sx={{ minWidth: 180 }}>
                    {NODE_TYPES.map((value) => <MenuItem key={value || 'all'} value={value}>{value || 'All types'}</MenuItem>)}
                </TextField>
                <TextField select label="Relationship" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} sx={{ minWidth: 180 }}>
                    {RELATIONSHIP_TYPES.map((value) => <MenuItem key={value || 'all'} value={value}>{value || 'All relationships'}</MenuItem>)}
                </TextField>
                <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 160 }}>
                    {STATUSES.map((value) => <MenuItem key={value || 'all'} value={value}>{value || 'All statuses'}</MenuItem>)}
                </TextField>
                <TextField select label="Provenance" value={provenance} onChange={(event) => setProvenance(event.target.value)} sx={{ minWidth: 160 }}>
                    {PROVENANCES.map((value) => <MenuItem key={value || 'all'} value={value}>{value || 'All provenance'}</MenuItem>)}
                </TextField>
                <Button variant="contained" onClick={() => {
                    setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        if (q) next.set('q', q); else next.delete('q');
                        if (nodeType) next.set('nodeType', nodeType); else next.delete('nodeType');
                        return next;
                    });
                    load(selectedId);
                }}>
                    Apply filters
                </Button>
            </Stack>

            {summary && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                    <MetricCard label="Nodes" value={summary.nodeCount} />
                    <MetricCard label="Relationships" value={summary.relationshipCount} />
                    <MetricCard label="Active relationships" value={summary.activeRelationshipCount} />
                    <MetricCard label="Orphans" value={summary.orphanNodes.length} />
                </Stack>
            )}

            <QueryState
                loading={loading}
                error={error}
                empty={!loading && nodes.length === 0}
                emptyTitle="No graph records yet"
                emptyBody="Register third-party records first. The graph only stores proven relationships, not invented ones."
            >
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                    <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>Objects</Typography>
                        <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                            {nodes.map((node) => (
                                <Box
                                    key={node.id}
                                    component="li"
                                >
                                    <Button
                                        fullWidth
                                        onClick={() => {
                                            setSelected(node);
                                            setSearchParams((current) => {
                                                const next = new URLSearchParams(current);
                                                next.set('nodeId', node.id);
                                                return next;
                                            });
                                            load(node.id);
                                        }}
                                        sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1 }}
                                        aria-current={selected?.id === node.id ? 'true' : undefined}
                                    >
                                        <Box>
                                            <Typography variant="subtitle2">{node.displayLabel}</Typography>
                                            <Typography variant="caption">{node.nodeType} · {node.status}</Typography>
                                        </Box>
                                    </Button>
                                </Box>
                            ))}
                        </Box>
                    </Surface>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {selected && (
                            <>
                                <Typography variant="overline">Selected object</Typography>
                                <Typography variant="h3">{selected.displayLabel}</Typography>
                                <Stack direction="row" spacing={1} sx={{ my: 1 }} useFlexGap flexWrap="wrap">
                                    <StatusBadge kind="plain" label={selected.nodeType} />
                                    <StatusBadge kind="plain" label={selected.status} />
                                </Stack>
                                {selected.recordHref && (
                                    <Button component={RouterLink} to={selected.recordHref} sx={{ mb: 2 }}>Open authoritative record</Button>
                                )}
                                <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
                                    <Tab label="Relationships" />
                                    <Tab label="Impact" />
                                    <Tab label="Lineage" />
                                </Tabs>
                                {tab === 0 && (
                                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Direct relationships">
                                        <Box component="thead">
                                            <Box component="tr">
                                                <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Relationship</Box>
                                                <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Related object</Box>
                                                <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Provenance</Box>
                                            </Box>
                                        </Box>
                                        <Box component="tbody">
                                            {visibleRelationships.length === 0 && (
                                                <Box component="tr">
                                                    <Box component="td" colSpan={3} sx={{ py: 2 }}>
                                                        <Alert severity="info">No proven relationships match these filters.</Alert>
                                                    </Box>
                                                </Box>
                                            )}
                                            {visibleRelationships.map((row) => {
                                                const other = row.fromNode.id === selected.id ? row.toNode : row.fromNode;
                                                return (
                                                    <Box component="tr" key={row.id} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                                                        <Box component="td" sx={{ py: 1 }}>{row.relationshipType.replace(/_/g, ' ')}</Box>
                                                        <Box component="td" sx={{ py: 1 }}>
                                                            <Button size="small" onClick={() => load(other.id)}>{other.displayLabel}</Button>
                                                            <Typography variant="caption" display="block">{other.nodeType}</Typography>
                                                        </Box>
                                                        <Box component="td" sx={{ py: 1 }}>{row.provenance} · {row.authority}</Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}
                                {tab === 1 && (
                                    <Stack spacing={1} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                        {impactNodes.filter((node) => node.id !== selected.id).map((node) => (
                                            <Box key={node.id} component="li" sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                <Typography variant="subtitle2">{node.displayLabel}</Typography>
                                                <Typography variant="caption">{node.nodeType}</Typography>
                                                {node.recordHref && <Button component={RouterLink} to={node.recordHref} size="small">Open record</Button>}
                                            </Box>
                                        ))}
                                        {impactNodes.length <= 1 && <Alert severity="info">No related impact objects are stored for this selection.</Alert>}
                                    </Stack>
                                )}
                                {tab === 2 && (
                                    <Stack spacing={1} component="ol" sx={{ m: 0, pl: 3 }}>
                                        {lineageHops.map((hop) => (
                                            <Box key={`${hop.edge.id}-${hop.node.id}`} component="li">
                                                <Typography variant="subtitle2">{hop.node.displayLabel}</Typography>
                                                <Typography variant="caption">
                                                    Depth {hop.depth} · {hop.edge.relationshipType.replace(/_/g, ' ')}
                                                </Typography>
                                            </Box>
                                        ))}
                                        {lineageHops.length === 0 && <Alert severity="info">No inbound lineage is stored for this object.</Alert>}
                                    </Stack>
                                )}
                            </>
                        )}
                    </Box>
                </Stack>
            </QueryState>
        </Box>
    );
}
