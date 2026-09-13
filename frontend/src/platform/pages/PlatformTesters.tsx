import { useEffect, useState } from 'react';
import { Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, Panel } from '../ui';

type OrgRow = Record<string, unknown>;

export default function PlatformTesters() {
    const [rows, setRows] = useState<OrgRow[]>([]);
    const [matches, setMatches] = useState<OrgRow[]>([]);
    const [organizationName, setOrganizationName] = useState('');
    const [testerEmail, setTesterEmail] = useState('');
    const [testerRole, setTesterRole] = useState('ORGANIZATION_ADMIN');
    const [search, setSearch] = useState('');
    const [activationUrl, setActivationUrl] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
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

    const designate = (organizationId: string, enabled: boolean, name: string) => {
        setError(null);
        platformAPI.setOrganizationTestingAccess(organizationId, enabled)
            .then(() => {
                setNotice(enabled
                    ? `Evaluation access enabled for ${name}. Billing remains test-only.`
                    : `Evaluation access revoked for ${name}.`);
                load();
                if (search.trim()) {
                    platformAPI.organizations({ q: search.trim() })
                        .then((response) => setMatches(response.data.data || []));
                }
            })
            .catch((err) => setError(err.message));
    };

    return (
        <QueryState loading={loading} error={error}>
            <Panel title="Designate an existing organization">
                <Typography sx={{ mb: 2, color: '#c9b8a6' }}>
                    Grant evaluation access to an organization that already exists. This unlocks private-testing product
                    capabilities for the organization without a purchased plan or live Stripe charges. Individual roles
                    still apply — a viewer cannot export because the organization is designated.
                </Typography>
                <TextField
                    size="small"
                    label="Search organizations"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    sx={{ mr: 1, mb: 1, minWidth: 280 }}
                />
                <Button
                    variant="outlined"
                    onClick={() => {
                        setError(null);
                        platformAPI.organizations({ q: search.trim() })
                            .then((response) => setMatches(response.data.data || []))
                            .catch((err) => setError(err.message));
                    }}
                >
                    Search
                </Button>
                {matches.length > 0 && (
                    <Table size="small" aria-label="Organizations to designate" sx={{ mt: 2 }}>
                        <TableHead>
                            <TableRow>
                                {['Organization', 'Plan', 'Status', 'Evaluation access', ''].map((col) => (
                                    <TableCell key={col} sx={{ color: '#c4955c' }}>{col}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {matches.map((row) => {
                                const testing = Boolean(row.testingAccess || row.isDemo);
                                return (
                                    <TableRow key={String(row.id)}>
                                        <TableCell>{String(row.name)}</TableCell>
                                        <TableCell>{String(row.plan)}</TableCell>
                                        <TableCell>{String(row.status)}</TableCell>
                                        <TableCell>{testing ? 'Enabled' : 'Off'}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                variant={testing ? 'outlined' : 'contained'}
                                                onClick={() => designate(String(row.id), !testing, String(row.name))}
                                            >
                                                {testing ? 'Revoke evaluation access' : 'Enable evaluation access'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
                {notice && <Typography sx={{ mt: 2 }}>{notice}</Typography>}
            </Panel>
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
                <EmptyState>No organizations currently have evaluation access.</EmptyState>
            ) : (
                <Table size="small" aria-label="Organizations with evaluation access">
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
                                    <Button size="small" onClick={() => designate(String(row.id), false, String(row.name))}>
                                        Revoke evaluation access
                                    </Button>
                                    <Button size="small" color="warning" onClick={() => platformAPI.disableTester(String(row.id)).then(load)}>
                                        Disable users
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
