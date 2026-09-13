import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, HealthChip, Panel } from '../ui';

export default function PlatformOrganizations() {
    const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
    const [plan, setPlan] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        platformAPI
            .organizations({ ...(plan ? { plan } : {}), ...(status ? { status } : {}) })
            .then((response) => setRows(response.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [plan, status]);

    return (
        <QueryState loading={loading} error={error}>
            <Panel title="Filters">
                <TextField select size="small" label="Plan" value={plan} onChange={(event) => setPlan(event.target.value)} sx={{ mr: 2, minWidth: 160 }}>
                    <MenuItem value="">All</MenuItem>
                    {['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'].map((value) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                    ))}
                </TextField>
                <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 160 }}>
                    <MenuItem value="">All</MenuItem>
                    {['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'].map((value) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                    ))}
                </TextField>
            </Panel>
            {rows.length === 0 ? (
                <EmptyState>No organizations match the current filters.</EmptyState>
            ) : (
                <Table size="small" aria-label="Organization directory">
                    <TableHead>
                        <TableRow>
                            {['Organization', 'Plan', 'Status', 'Evaluation', 'Users', 'Vendors', 'Tickets', 'Health'].map((col) => (
                                <TableCell key={col} sx={{ color: '#c4955c' }}>{col}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={String(row.id)}>
                                <TableCell>
                                    <Link to={`/platform/organizations/${row.id}`} style={{ color: '#e8c9a0' }}>{String(row.name)}</Link>
                                </TableCell>
                                <TableCell>{String(row.plan)}</TableCell>
                                <TableCell>{String(row.status)}</TableCell>
                                <TableCell>{row.testingAccess || row.isDemo ? 'Enabled' : 'Off'}</TableCell>
                                <TableCell>{String(row.activeUsers)}</TableCell>
                                <TableCell>{String(row.vendorCount)}</TableCell>
                                <TableCell>{String(row.openSupportTickets)}</TableCell>
                                <TableCell><HealthChip value={String(row.health)} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </QueryState>
    );
}
