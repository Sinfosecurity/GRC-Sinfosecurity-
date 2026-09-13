import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Surface from './design/Surface';
import { color } from '../design/tokens';
import { governanceAPI } from '../services/api';

type GraphNode = {
    id: string;
    nodeType: string;
    displayLabel: string;
    status: string;
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

type GroupKey = 'Requirements' | 'Evidence' | 'Tests' | 'Findings' | 'Risks' | 'Other records';

const RELATION_LABELS: Record<string, string> = {
    SATISFIED_BY: 'Satisfies',
    SATISFIES: 'Satisfies',
    SUPPORTED_BY: 'Supported by',
    EVIDENCED_BY: 'Supported by',
    TESTED_BY: 'Tested by',
    HAS_FINDING: 'Linked finding',
    HAS_RISK: 'Related risk',
    MITIGATES: 'Helps reduce',
    MAPS_TO: 'Mapped to',
    REQUIRED_BY: 'Required by',
    CONTROLLED_BY: 'Governed by',
    ASSESSED_BY: 'Assessed by',
    APPLIES_TO: 'Applies to',
    COVERED_BY: 'Covered by',
    GOVERNED_BY: 'Governed by',
};

const NODE_LABELS: Record<string, string> = {
    REQUIREMENT: 'Requirement',
    FRAMEWORK: 'Framework',
    EVIDENCE: 'Evidence',
    CONTROL: 'Control',
    CONTROL_TEST: 'Control test',
    FINDING: 'Finding',
    RISK: 'Risk',
    VENDOR: 'Vendor',
    ASSESSMENT: 'Assessment',
    DECISION: 'Decision',
};

const GROUP_ORDER: GroupKey[] = ['Requirements', 'Evidence', 'Tests', 'Findings', 'Risks', 'Other records'];

function groupFor(nodeType: string): GroupKey {
    if (nodeType === 'REQUIREMENT' || nodeType === 'FRAMEWORK' || nodeType === 'REGULATION' || nodeType === 'POLICY') return 'Requirements';
    if (nodeType === 'EVIDENCE') return 'Evidence';
    if (nodeType === 'CONTROL_TEST') return 'Tests';
    if (nodeType === 'FINDING' || nodeType === 'REMEDIATION') return 'Findings';
    if (nodeType === 'RISK') return 'Risks';
    return 'Other records';
}

function relationLabel(type: string) {
    return RELATION_LABELS[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function nodeKind(type: string) {
    return NODE_LABELS[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EntityRelationships({
    sourceModel,
    sourceId,
    embedded = false,
    compact = false,
}: {
    sourceModel: string;
    sourceId?: string | null;
    embedded?: boolean;
    compact?: boolean;
}) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [node, setNode] = useState<GraphNode | null>(null);
    const [relationships, setRelationships] = useState<Relationship[]>([]);

    useEffect(() => {
        if (!sourceId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        governanceAPI
            .lookup({ sourceModel, sourceId })
            .then(async (res) => {
                const match = res.data.data;
                if (!match) {
                    if (!cancelled) {
                        setNode(null);
                        setRelationships([]);
                    }
                    return;
                }
                const rel = await governanceAPI.relationships(match.id);
                if (!cancelled) {
                    setNode(match);
                    setRelationships(rel.data.data?.relationships || []);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                if (err.status === 404) {
                    setNode(null);
                    setRelationships([]);
                    return;
                }
                setError(err.message || 'Unable to load relationships');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [sourceModel, sourceId]);

    const grouped = useMemo(() => {
        const buckets = new Map<GroupKey, Array<{ row: Relationship; other: GraphNode }>>();
        for (const key of GROUP_ORDER) buckets.set(key, []);
        for (const row of relationships) {
            const other = row.fromNode.id === node?.id ? row.toNode : row.fromNode;
            const key = groupFor(other.nodeType);
            buckets.get(key)!.push({ row, other });
        }
        return GROUP_ORDER
            .map((title) => ({ title, items: buckets.get(title) || [] }))
            .filter((group) => group.items.length > 0);
    }, [node, relationships]);

    if (!sourceId) return null;

    const body = (
        <>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                <Box>
                    {!embedded && <Typography variant="h5">Related records</Typography>}
                    <Typography variant="body2">
                        {compact
                            ? 'What this record is connected to in the workspace.'
                            : 'Grouped connections from this record. Open a row to work in its workspace.'}
                    </Typography>
                </Box>
                <Button component={RouterLink} to={node ? `/governance-graph?nodeId=${node.id}` : '/governance-graph'} size="small">
                    Open graph
                </Button>
            </Stack>
            {loading && <Typography variant="body2">Loading related records…</Typography>}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && !node && (
                <Typography variant="body2">No related records are registered for this item yet.</Typography>
            )}
            {!loading && node && relationships.length === 0 && (
                <Typography variant="body2">No related records are stored for this item yet.</Typography>
            )}
            <Stack spacing={2}>
                {grouped.map((group) => (
                    <Box key={group.title}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{group.title}</Typography>
                        <Stack spacing={1} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                            {group.items.map(({ row, other }) => (
                                <Box
                                    key={row.id}
                                    component="li"
                                    sx={{
                                        p: compact ? 1 : 1.5,
                                        border: `1px solid ${color.line}`,
                                        borderRadius: '6px',
                                        bgcolor: color.surface,
                                    }}
                                >
                                    <Typography variant="subtitle2">{other.displayLabel}</Typography>
                                    <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
                                        {nodeKind(other.nodeType)} · {relationLabel(row.relationshipType)}
                                    </Typography>
                                    {other.recordHref && (
                                        <Button component={RouterLink} to={other.recordHref} size="small" sx={{ mt: 0.5, px: 0 }}>
                                            Open {nodeKind(other.nodeType).toLowerCase()}
                                        </Button>
                                    )}
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </>
    );

    if (embedded) return body;
    return <Surface>{body}</Surface>;
}
