import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import QueryState from '../components/QueryState';
import { auditAPI } from '../services/api';

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
    const pageSize = 25;

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
        <Box sx={{ maxWidth: 1200 }}>
            <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: '0.14em' }}>
                Administration
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Audit log</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Tenant-scoped events only. Search by actor, action, resource, or result.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <TextField label="Search" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 220 }} />
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
                <Card sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                    <CardContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Timestamp</TableCell>
                                    <TableCell>Actor</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Resource</TableCell>
                                    <TableCell>Result</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => {
                                    const actor = row.actor
                                        ? `${row.actor.firstName || ''} ${row.actor.lastName || ''}`.trim() || row.actor.email
                                        : 'system';
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                                            <TableCell>{actor}</TableCell>
                                            <TableCell>{row.action}</TableCell>
                                            <TableCell>{row.resourceType}{row.resourceId ? ` · ${row.resourceId.slice(0, 8)}` : ''}</TableCell>
                                            <TableCell><Chip size="small" label={row.result} color={row.result === 'success' ? 'success' : 'warning'} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                            <Button disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
                            <Typography variant="body2">Page {page} of {pages} · {total} events</Typography>
                            <Button disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
                        </Stack>
                    </CardContent>
                </Card>
            </QueryState>
        </Box>
    );
}
