import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import AppTable from '../components/design/AppTable';
import { intelligenceAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

export default function IntelligenceChanges() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [priority, setPriority] = useState('');
    const [domain, setDomain] = useState('');
    const [status, setStatus] = useState('');

    const load = () => {
        setLoading(true);
        intelligenceAPI.items({ q, priority, domain, status, current: 'all' })
            .then((res) => setRows(res.data.data || []))
            .catch((err) => setError(err.message || 'Unable to search intelligence'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Intelligence', to: '/intelligence' }, { label: 'What changed' }]}
                title="What changed"
                description="Material changes from governed records. This is not an audit dump."
            />
            <Box sx={{ mb: 2 }}>
            <Surface>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                    <TextField label="Search" value={q} onChange={(event) => setQ(event.target.value)} size="small" />
                    <TextField select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} size="small" sx={{ minWidth: 180 }}>
                        <MenuItem value="">All priorities</MenuItem>
                        <MenuItem value="CRITICAL_ATTENTION">Critical attention</MenuItem>
                        <MenuItem value="HIGH_ATTENTION">High attention</MenuItem>
                        <MenuItem value="REVIEW">Review</MenuItem>
                        <MenuItem value="POSITIVE">Positive movement</MenuItem>
                    </TextField>
                    <TextField select label="Domain" value={domain} onChange={(event) => setDomain(event.target.value)} size="small" sx={{ minWidth: 180 }}>
                        <MenuItem value="">All products</MenuItem>
                        {['THIRD_PARTY', 'RISK', 'CONTROL', 'EVIDENCE', 'COMPLIANCE', 'PRIVACY', 'AI_GOVERNANCE', 'DECISION'].map((value) => (
                            <MenuItem key={value} value={value}>{humanizeLabel(value)}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} size="small" sx={{ minWidth: 180 }}>
                        <MenuItem value="">All states</MenuItem>
                        {['NEW', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED_BY_SOURCE', 'SUPERSEDED'].map((value) => (
                            <MenuItem key={value} value={value}>{humanizeLabel(value)}</MenuItem>
                        ))}
                    </TextField>
                    <Button variant="contained" onClick={load}>Apply</Button>
                </Stack>
            </Surface>
            </Box>
            <QueryState loading={loading} error={error} empty={!rows.length} emptyTitle="No matching intelligence" emptyBody="Filters apply to derived intelligence, not a second database.">
                <AppTable
                    rows={rows}
                    rowKey={(row: any) => row.publicId}
                    emptyTitle="No matching intelligence"
                    emptyBody="Filters apply to derived intelligence, not a second database."
                    onRowClick={(row: any) => navigate(row.href)}
                    columns={[
                        { id: 'id', label: 'Item', render: (row: any) => row.publicId },
                        { id: 'priority', label: 'Priority', render: (row: any) => row.priorityLabel || humanizeLabel(row.priority) },
                        { id: 'title', label: 'What happened', render: (row: any) => row.title },
                        { id: 'domain', label: 'Product', render: (row: any) => humanizeLabel(row.domain) },
                        { id: 'state', label: 'State', render: (row: any) => humanizeLabel(row.lifecycle) },
                    ]}
                />
            </QueryState>
        </Box>
    );
}
