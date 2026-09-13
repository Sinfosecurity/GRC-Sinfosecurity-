import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Surface from './design/Surface';
import StatusBadge from './design/StatusBadge';
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

export default function EntityRelationships({
    sourceModel,
    sourceId,
}: {
    sourceModel: string;
    sourceId?: string | null;
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
            .search({ q: sourceId })
            .then(async (res) => {
                const match = (res.data.data?.nodes || []).find(
                    (item: GraphNode & { sourceModel?: string; sourceId?: string }) =>
                        item.sourceModel === sourceModel && item.sourceId === sourceId
                );
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
                if (!cancelled) setError(err.message || 'Unable to load relationships');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [sourceModel, sourceId]);

    if (!sourceId) return null;

    return (
        <Surface>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                <Box>
                    <Typography variant="h5">Relationships</Typography>
                    <Typography variant="body2">
                        Proven connections from the governance graph. This is not a separate product.
                    </Typography>
                </Box>
                <Button component={RouterLink} to={node ? `/governance-graph?nodeId=${node.id}` : '/governance-graph'} size="small">
                    Open graph
                </Button>
            </Stack>
            {loading && <Typography variant="body2">Loading relationships…</Typography>}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && !node && (
                <Typography variant="body2">No graph node is registered for this record yet.</Typography>
            )}
            {!loading && node && relationships.length === 0 && (
                <Typography variant="body2">No proven relationships are stored for this record.</Typography>
            )}
            <Stack spacing={1} component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                {relationships.map((row) => {
                    const other = row.fromNode.id === node?.id ? row.toNode : row.fromNode;
                    return (
                        <Box key={row.id} component="li" sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2">{row.relationshipType.replace(/_/g, ' ')}</Typography>
                            <Typography variant="body2">{other.displayLabel}</Typography>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                                <StatusBadge kind="plain" label={other.nodeType} />
                                <StatusBadge kind="plain" label={row.provenance} />
                                <StatusBadge kind="plain" label={row.authority} />
                            </Stack>
                            {other.recordHref && (
                                <Button component={RouterLink} to={other.recordHref} size="small" sx={{ mt: 0.5 }}>
                                    Open record
                                </Button>
                            )}
                        </Box>
                    );
                })}
            </Stack>
        </Surface>
    );
}
