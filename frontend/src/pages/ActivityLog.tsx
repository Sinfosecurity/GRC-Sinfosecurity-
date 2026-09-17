import { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import StatusBadge from '../components/design/StatusBadge';
import { auditAPI } from '../services/api';
import { formatDateTime } from '../utils/humanizeLabel';

type AuditRow = {
    id: string;
    timestamp: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    result: string;
    actor?: { email?: string; firstName?: string; lastName?: string } | null;
};

export default function ActivityLog() {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [action, setAction] = useState('');
    const [resourceType, setResourceType] = useState('');
    const [result, setResult] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 12;

    const load = async (nextPage = page) => {
        setLoading(true);
        setError(null);
        try {
            const response = await auditAPI.logs({
                q: q || undefined,
                action: action || undefined,
                resourceType: resourceType || undefined,
                result: result || undefined,
                page: nextPage,
                pageSize,
            });
            setRows(response.data.data || []);
            setTotal(response.data.total || 0);
            setPage(response.data.page || nextPage);
        } catch (err: any) {
            setError(err.message || 'Unable to load audit log');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Audit Log' }]}
                title="Audit log"
                description="Tenant-scoped events only. Search by actor, action, resource, or result."
            />
            <Surface>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                    <TextField label="Search" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 220, flex: 1 }} />
                    <TextField label="Action" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 180 }} />
                    <TextField label="Resource" value={resourceType} onChange={(e) => setResourceType(e.target.value)} sx={{ minWidth: 160 }} />
                    <TextField select label="Result" value={result} onChange={(e) => setResult(e.target.value)} sx={{ minWidth: 140 }}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="success">success</MenuItem>
                        <MenuItem value="failure">failure</MenuItem>
                    </TextField>
                    <Button variant="contained" onClick={() => load(1)}>Apply</Button>
                </Stack>
                <QueryState loading={loading} error={error} empty={rows.length === 0} emptyTitle="No audit events" emptyBody="Actions taken in this organization will appear here.">
                    <AppTable
                        embedded
                        rows={rows}
                        rowKey={(row) => row.id}
                        pageSize={pageSize}
                        searchPlaceholder="Filter this page"
                        searchValue={(row) => `${row.action} ${row.resourceType} ${row.result} ${row.actor?.email || ''}`}
                        columns={[
                            { id: 'when', label: 'Timestamp', sortValue: (row) => row.timestamp, render: (row) => formatDateTime(row.timestamp) },
                            { id: 'actor', label: 'Actor', render: (row) => {
                                const actor = row.actor
                                    ? `${row.actor.firstName || ''} ${row.actor.lastName || ''}`.trim() || row.actor.email
                                    : 'system';
                                return actor || 'system';
                            } },
                            { id: 'action', label: 'Action', sortValue: (row) => row.action, render: (row) => row.action },
                            { id: 'resource', label: 'Resource', hideOnMobile: true, render: (row) => (
                                `${row.resourceType}${row.resourceId ? ` · ${row.resourceId.slice(0, 8)}` : ''}`
                            ) },
                            { id: 'result', label: 'Result', render: (row) => (
                                <StatusBadge
                                    kind="plain"
                                    tone={row.result === 'success' ? 'success' : 'high'}
                                    label={row.result}
                                />
                            ) },
                        ]}
                        toolbar={(
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
                                <Button disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
                            </Stack>
                        )}
                    />
                    <Box sx={{ px: { xs: 2, md: 3 }, pb: 2, color: 'text.secondary', fontSize: 13 }}>
                        Page {page} of {pages} · {total} events
                    </Box>
                </QueryState>
            </Surface>
        </WorkspaceFrame>
    );
}
