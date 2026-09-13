import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Chip,
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

const NODE_TYPES = ['', 'ORGANIZATION', 'VENDOR', 'ASSESSMENT', 'EVIDENCE', 'FINDING', 'REMEDIATION', 'RISK', 'DECISION', 'CONTRACT', 'CONTROL', 'FRAMEWORK', 'REQUIREMENT', 'CONTROL_TEST'];
const RELATIONSHIP_TYPES = ['', 'OWNS', 'USES', 'HAS_RISK', 'ASSESSED_BY', 'HAS_FINDING', 'REMEDIATED_BY', 'SUPPORTED_BY', 'APPLIES_TO', 'CONTROLLED_BY', 'MITIGATES'];
const STATUSES = ['', 'ACTIVE', 'ARCHIVED', 'TERMINATED', 'OFFBOARDING'];
const PROVENANCES = ['', 'SYSTEM', 'USER', 'IMPORT', 'ASSESSMENT', 'RULE'];
const SEARCH_DEBOUNCE_MS = 400;

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
    archivedAt?: string | null;
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

function otherNode(row: Relationship, selectedId: string) {
    return row.fromNode.id === selectedId ? row.toNode : row.fromNode;
}

function formatType(value?: string) {
    return (value || '').replace(/_/g, ' ');
}

export default function GovernanceGraphExplorer() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [q, setQ] = useState(searchParams.get('q') || '');
    const [debouncedQ, setDebouncedQ] = useState(searchParams.get('q') || '');
    const [nodeType, setNodeType] = useState(searchParams.get('nodeType') || '');
    const [relationshipType, setRelationshipType] = useState(searchParams.get('relationshipType') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [provenance, setProvenance] = useState(searchParams.get('provenance') || '');
    const [tab, setTab] = useState(0);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingWorkspace, setLoadingWorkspace] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [selected, setSelected] = useState<GraphNode | null>(null);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [impactNodes, setImpactNodes] = useState<GraphNode[] | null>(null);
    const [lineageHops, setLineageHops] = useState<Array<{ depth: number; node: GraphNode; edge: Relationship }> | null>(null);
    const summaryLoaded = useRef(false);
    const workspaceCache = useRef<Record<string, { node?: GraphNode; relationships: Relationship[]; impact?: GraphNode[]; lineage?: Array<{ depth: number; node: GraphNode; edge: Relationship }> }>>({});

    useEffect(() => {
        const handle = window.setTimeout(() => setDebouncedQ(q.trim()), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(handle);
    }, [q]);

    useEffect(() => {
        const controller = new AbortController();
        const loadList = async () => {
            setLoadingList(true);
            setError(null);
            try {
                const requests: Array<Promise<unknown>> = [
                    governanceAPI.search({
                        q: debouncedQ || undefined,
                        nodeType: nodeType || undefined,
                        status: status || undefined,
                    }, { signal: controller.signal }),
                ];
                if (!summaryLoaded.current) {
                    requests.unshift(governanceAPI.summary({ signal: controller.signal }));
                }
                const results = await Promise.all(requests);
                if (!summaryLoaded.current) {
                    const summaryRes = results.shift() as { data: { data: Summary } };
                    setSummary(summaryRes.data.data);
                    summaryLoaded.current = true;
                }
                const searchRes = results[0] as { data: { data: { nodes: GraphNode[] } } };
                setNodes(searchRes.data.data?.nodes || []);
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                setError(err.message || 'Unable to load the governance graph');
            } finally {
                if (!controller.signal.aborted) setLoadingList(false);
            }
        };
        loadList();
        return () => controller.abort();
    }, [debouncedQ, nodeType, status]);

    const selectedId = searchParams.get('nodeId') || '';

    useEffect(() => {
        if (!selectedId) {
            setSelected(null);
            setRelationships([]);
            setImpactNodes(null);
            setLineageHops(null);
            setWorkspaceError(null);
            return;
        }
        const cached = workspaceCache.current[selectedId];
        if (cached) {
            setSelected(cached.node || nodes.find((node) => node.id === selectedId) || null);
            setRelationships(cached.relationships);
            setImpactNodes(cached.impact || null);
            setLineageHops(cached.lineage || null);
            setWorkspaceError(null);
            return;
        }
        const controller = new AbortController();
        const loadWorkspace = async () => {
            setLoadingWorkspace(true);
            setWorkspaceError(null);
            try {
                const fromList = nodes.find((node) => node.id === selectedId);
                const nodeRes = fromList ? null : await governanceAPI.node(selectedId, { signal: controller.signal });
                const node = fromList || nodeRes?.data.data;
                const relRes = await governanceAPI.relationships(selectedId, undefined, { signal: controller.signal });
                const rels: Relationship[] = relRes.data.data?.relationships || [];
                workspaceCache.current[selectedId] = {
                    node,
                    relationships: rels,
                };
                setSelected(node);
                setRelationships(rels);
                setImpactNodes(null);
                setLineageHops(null);
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                setWorkspaceError(err.message || 'Unable to load the selected object');
            } finally {
                if (!controller.signal.aborted) setLoadingWorkspace(false);
            }
        };
        loadWorkspace();
        return () => controller.abort();
        // nodes is intentionally omitted so list refreshes do not refetch the workspace
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    useEffect(() => {
        if (!selectedId || tab !== 1) return;
        const cached = workspaceCache.current[selectedId];
        if (cached?.impact) {
            setImpactNodes(cached.impact);
            return;
        }
        const controller = new AbortController();
        governanceAPI.impact(selectedId, undefined, { signal: controller.signal })
            .then((res) => {
                const next = res.data.data?.nodes || [];
                workspaceCache.current[selectedId] = {
                    ...(workspaceCache.current[selectedId] || { relationships: [] }),
                    impact: next,
                };
                setImpactNodes(next);
            })
            .catch((err) => {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                setWorkspaceError(err.message || 'Unable to load impact');
            });
        return () => controller.abort();
    }, [selectedId, tab]);

    useEffect(() => {
        if (!selectedId || tab !== 2) return;
        const cached = workspaceCache.current[selectedId];
        if (cached?.lineage) {
            setLineageHops(cached.lineage);
            return;
        }
        const controller = new AbortController();
        governanceAPI.lineage(selectedId, undefined, { signal: controller.signal })
            .then((res) => {
                const next = res.data.data?.hops || [];
                workspaceCache.current[selectedId] = {
                    ...(workspaceCache.current[selectedId] || { relationships: [] }),
                    lineage: next,
                };
                setLineageHops(next);
            })
            .catch((err) => {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                setWorkspaceError(err.message || 'Unable to load lineage');
            });
        return () => controller.abort();
    }, [selectedId, tab]);

    const visibleRelationships = useMemo(() => {
        return relationships.filter((row) => {
            if (relationshipType && row.relationshipType !== relationshipType) return false;
            if (provenance && row.provenance !== provenance) return false;
            return true;
        });
    }, [relationships, relationshipType, provenance]);

    const incoming = visibleRelationships.filter((row) => row.toNode.id === selected?.id);
    const outgoing = visibleRelationships.filter((row) => row.fromNode.id === selected?.id);
    const relatedByType = (type: string) =>
        visibleRelationships
            .map((row) => otherNode(row, selected?.id || ''))
            .filter((node) => node.nodeType === type);

    const selectNode = (nodeId: string) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('nodeId', nodeId);
            if (debouncedQ) next.set('q', debouncedQ); else next.delete('q');
            if (nodeType) next.set('nodeType', nodeType); else next.delete('nodeType');
            return next;
        });
        setTab(0);
    };

    const recentExamples = (summary?.recentChanges || []).slice(0, 6);
    const TYPE_RANK: Record<string, number> = {
        VENDOR: 0,
        DECISION: 1,
        FINDING: 2,
        ASSESSMENT: 3,
        RISK: 4,
        ORGANIZATION: 5,
        CONTROL: 6,
        CONTRACT: 7,
        REMEDIATION: 8,
        EVIDENCE: 9,
    };
    const rankedNodes = [...nodes].sort((left, right) => {
        const rankDelta = (TYPE_RANK[left.nodeType] ?? 50) - (TYPE_RANK[right.nodeType] ?? 50);
        if (rankDelta !== 0) return rankDelta;
        return left.displayLabel.localeCompare(right.displayLabel);
    });

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                title="Governance Graph"
                description="Proven relationships for this organization. Open a record to see how vendors, assessments, evidence, findings, and decisions connect."
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
            </Stack>

            {summary && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                    <MetricCard label="Objects" value={summary.nodeCount} />
                    <MetricCard label="Relationships" value={summary.relationshipCount} />
                    <MetricCard label="Active relationships" value={summary.activeRelationshipCount} />
                </Stack>
            )}

            <QueryState
                loading={loadingList && !summary}
                error={error}
                empty={!loadingList && nodes.length === 0 && !selected}
                emptyTitle={summary?.nodeCount ? 'No graph records match' : 'No graph records yet'}
                emptyBody="The graph only stores proven relationships from this organization’s third-party records."
            >
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={2}
                    sx={{ flexDirection: { xs: selected ? 'column-reverse' : 'column', lg: 'row' } }}
                >
                    <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
                        <Surface>
                            <Typography variant="h5" sx={{ mb: 1 }}>Objects</Typography>
                            {loadingList && <Typography variant="body2">Updating results…</Typography>}
                            <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', maxHeight: { xs: 260, lg: '68vh' }, overflowY: 'auto' }}>
                                {rankedNodes.map((node) => (
                                    <Box key={node.id} component="li">
                                        <Button
                                            fullWidth
                                            onClick={() => selectNode(node.id)}
                                            sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1 }}
                                            aria-current={selected?.id === node.id ? 'true' : undefined}
                                        >
                                            <Box>
                                                <Typography variant="subtitle2">{node.displayLabel}</Typography>
                                                <Typography variant="caption">{formatType(node.nodeType)} · {node.status}</Typography>
                                            </Box>
                                        </Button>
                                    </Box>
                                ))}
                            </Box>
                        </Surface>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {!selected && (
                            <Stack spacing={2}>
                                <Surface>
                                    <Typography variant="h5">Select an object</Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Choose a vendor, assessment, finding, evidence record, or decision to see proven relationships, impact, and lineage. Nothing here is invented.
                                    </Typography>
                                </Surface>
                                {recentExamples.length > 0 && (
                                    <Surface>
                                        <Typography variant="h5" sx={{ mb: 1 }}>Recent relationship changes</Typography>
                                        <Stack spacing={1} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                            {recentExamples.map((row) => (
                                                <Box key={row.id} component="li" sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle2">{formatType(row.relationshipType)}</Typography>
                                                    <Typography variant="body2">
                                                        {row.fromNode.displayLabel} → {row.toNode.displayLabel}
                                                    </Typography>
                                                    <Button size="small" onClick={() => selectNode(row.fromNode.id)}>Open {row.fromNode.displayLabel}</Button>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Surface>
                                )}
                            </Stack>
                        )}
                        {selected && (
                            <Stack spacing={2}>
                                <Surface>
                                    <Typography variant="overline">Selected entity</Typography>
                                    <Typography variant="h3">{selected.displayLabel}</Typography>
                                    <Stack direction="row" spacing={1} sx={{ my: 1 }} useFlexGap flexWrap="wrap">
                                        <StatusBadge kind="plain" label={formatType(selected.nodeType)} />
                                        <StatusBadge kind="plain" label={selected.status} />
                                    </Stack>
                                    <Typography variant="body2">Source: {selected.sourceModel || 'record'} {selected.sourceId ? `· ${selected.sourceId}` : ''}</Typography>
                                    {selected.recordHref && (
                                        <Button component={RouterLink} to={selected.recordHref} sx={{ mt: 1 }}>Open authoritative record</Button>
                                    )}
                                </Surface>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                                    <MetricCard label="Direct relationships" value={visibleRelationships.length} />
                                    <MetricCard label="Incoming" value={incoming.length} />
                                    <MetricCard label="Outgoing" value={outgoing.length} />
                                    <MetricCard label="Related risks" value={relatedByType('RISK').length} />
                                    <MetricCard label="Related findings" value={relatedByType('FINDING').length} />
                                    <MetricCard label="Related assessments" value={relatedByType('ASSESSMENT').length} />
                                </Stack>
                                <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
                                    <Tab label="Relationships" />
                                    <Tab label="Impact" />
                                    <Tab label="Lineage" />
                                </Tabs>
                                {loadingWorkspace && <Typography variant="body2">Loading relationships…</Typography>}
                                {workspaceError && <Alert severity="warning">{workspaceError}</Alert>}
                                {tab === 0 && (
                                    <>
                                        <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
                                            {visibleRelationships.length === 0 && (
                                                <Alert severity="info">No proven relationships match these filters.</Alert>
                                            )}
                                            {visibleRelationships.map((row) => {
                                                const other = otherNode(row, selected.id);
                                                return (
                                                    <Surface key={row.id}>
                                                        <Typography variant="subtitle2">{other.displayLabel}</Typography>
                                                        <Typography variant="caption" display="block">{formatType(other.nodeType)}</Typography>
                                                        <Typography variant="body2" sx={{ mt: 1 }}>{formatType(row.relationshipType)}</Typography>
                                                        <Typography variant="caption" display="block">{row.provenance} · {row.authority} · {row.archivedAt ? 'Historical' : other.status || 'ACTIVE'}</Typography>
                                                        <Button size="small" onClick={() => selectNode(other.id)} sx={{ mt: 1 }}>Open in graph</Button>
                                                    </Surface>
                                                );
                                            })}
                                        </Stack>
                                        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                                            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Direct relationships">
                                                <Box component="thead">
                                                    <Box component="tr">
                                                        <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Related object</Box>
                                                        <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Relationship</Box>
                                                        <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Provenance</Box>
                                                        <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Authority</Box>
                                                        <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Status</Box>
                                                    </Box>
                                                </Box>
                                                <Box component="tbody">
                                                    {visibleRelationships.length === 0 && (
                                                        <Box component="tr">
                                                            <Box component="td" colSpan={5} sx={{ py: 2 }}>
                                                                <Alert severity="info">No proven relationships match these filters.</Alert>
                                                            </Box>
                                                        </Box>
                                                    )}
                                                    {visibleRelationships.map((row) => {
                                                        const other = otherNode(row, selected.id);
                                                        return (
                                                            <Box component="tr" key={row.id} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                                                                <Box component="td" sx={{ py: 1 }}>
                                                                    <Button size="small" onClick={() => selectNode(other.id)}>{other.displayLabel}</Button>
                                                                    <Typography variant="caption" display="block">{formatType(other.nodeType)}</Typography>
                                                                </Box>
                                                                <Box component="td" sx={{ py: 1 }}>{formatType(row.relationshipType)}</Box>
                                                                <Box component="td" sx={{ py: 1 }}>{row.provenance}</Box>
                                                                <Box component="td" sx={{ py: 1 }}>{row.authority}</Box>
                                                                <Box component="td" sx={{ py: 1 }}>{row.archivedAt ? 'Historical' : other.status || 'ACTIVE'}</Box>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                                {tab === 1 && (
                                    <Stack spacing={1} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                        {(impactNodes || []).filter((node) => node.id !== selected.id).map((node) => (
                                            <Box key={node.id} component="li" sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                <Typography variant="subtitle2">{node.displayLabel}</Typography>
                                                <Typography variant="caption">{formatType(node.nodeType)}</Typography>
                                                <Button size="small" onClick={() => selectNode(node.id)}>Open in graph</Button>
                                                {node.recordHref && <Button component={RouterLink} to={node.recordHref} size="small">Open record</Button>}
                                            </Box>
                                        ))}
                                        {impactNodes && impactNodes.length <= 1 && <Alert severity="info">No related impact objects are stored for this selection.</Alert>}
                                    </Stack>
                                )}
                                {tab === 2 && (
                                    <Stack spacing={1}>
                                        <Typography variant="body2">How this object is connected, using only stored relationships.</Typography>
                                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                                            <Chip label={selected.displayLabel} color="primary" variant="outlined" />
                                            {(lineageHops || []).map((hop) => (
                                                <Chip
                                                    key={`${hop.edge.id}-${hop.node.id}`}
                                                    label={`${formatType(hop.edge.relationshipType)} · ${hop.node.displayLabel}`}
                                                    onClick={() => selectNode(hop.node.id)}
                                                />
                                            ))}
                                        </Stack>
                                        <Box component="ol" sx={{ m: 0, pl: 3 }}>
                                            {(lineageHops || []).map((hop) => (
                                                <Box key={`${hop.edge.id}-row`} component="li" sx={{ mb: 1 }}>
                                                    <Typography variant="subtitle2">{hop.node.displayLabel}</Typography>
                                                    <Typography variant="caption">
                                                        Depth {hop.depth} · {formatType(hop.edge.relationshipType)} · {hop.edge.provenance}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        {lineageHops && lineageHops.length === 0 && <Alert severity="info">No inbound lineage is stored for this object.</Alert>}
                                    </Stack>
                                )}
                                <Surface>
                                    <Typography variant="h5" sx={{ mb: 1 }}>Related records</Typography>
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        {selected.recordHref && <Button component={RouterLink} to={selected.recordHref}>This record</Button>}
                                        {['VENDOR', 'ASSESSMENT', 'EVIDENCE', 'FINDING', 'DECISION'].flatMap((type) =>
                                            relatedByType(type).slice(0, 3).map((node) => (
                                                node.recordHref
                                                    ? <Button key={node.id} component={RouterLink} to={node.recordHref}>{node.displayLabel}</Button>
                                                    : null
                                            ))
                                        )}
                                    </Stack>
                                </Surface>
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </QueryState>
        </Box>
    );
}
