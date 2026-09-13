import { useEffect, useState } from 'react';
import { Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, Panel } from '../ui';

export default function PlatformTesters() {
    const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
    const [organizationName, setOrganizationName] = useState('');
    const [testerEmail, setTesterEmail] = useState('');
    const [testerRole, setTesterRole] = useState('ORGANIZATION_ADMIN');
    const [activationUrl, setActivationUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        platformAPI.testers()
            .then((response) => setRows(response.data.data || []))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <QueryState loading={loading} error={error}>
            <Panel title="Invite a private tester">
                <Typography sx={{ mb: 2, color: '#c9b8a6' }}>
                    Each tester gets a unique identity and an isolated organization. Do not create a shared username or password.
                    The activation link is shown once. This is private testing, not production.
                </Typography>
                <TextField size="small" label="Organization name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} sx={{ mr: 1, mb: 1 }} />
                <TextField size="small" label="Tester email" value={testerEmail} onChange={(event) => setTesterEmail(event.target.value)} sx={{ mr: 1, mb: 1 }} />
                <TextField select size="small" label="Role" value={testerRole} onChange={(event) => setTesterRole(event.target.value)} sx={{ mr: 1, mb: 1, minWidth: 220 }}>
                    {['ORGANIZATION_ADMIN', 'ASSESSOR', 'APPROVER', 'VIEWER'].map((role) => (
                        <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                </TextField>
                <Button
                    variant="contained"
                    onClick={() => {
                        platformAPI.createTester({ organizationName, testerEmail, testerRole })
                            .then((response) => {
                                setActivationUrl(response.data.data.activationUrl);
                                setOrganizationName('');
                                setTesterEmail('');
                                load();
                            })
                            .catch((err) => setError(err.message));
                    }}
                >
                    Create tester organization
                </Button>
                {activationUrl && (
                    <Typography sx={{ mt: 2, wordBreak: 'break-all' }}>
                        One-time activation link: {activationUrl}
                    </Typography>
                )}
            </Panel>
            {rows.length === 0 ? (
                <EmptyState>No private-beta tester organizations yet.</EmptyState>
            ) : (
                <Table size="small" aria-label="Private testers">
                    <TableHead>
                        <TableRow>
                            {['Organization', 'Status', 'Users', 'Pending invites', ''].map((col) => (
                                <TableCell key={col} sx={{ color: '#c4955c' }}>{col}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={String(row.id)}>
                                <TableCell>{String(row.name)}</TableCell>
                                <TableCell>{String(row.status)}</TableCell>
                                <TableCell>{Array.isArray(row.users) ? row.users.length : 0}</TableCell>
                                <TableCell>{Array.isArray(row.invitations) ? row.invitations.length : 0}</TableCell>
                                <TableCell>
                                    <Button size="small" color="warning" onClick={() => platformAPI.disableTester(String(row.id)).then(load)}>
                                        Disable access
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </QueryState>
    );
}
