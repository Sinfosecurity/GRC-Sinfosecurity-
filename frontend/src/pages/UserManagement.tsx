import { FormEvent, useEffect, useState } from 'react';
import {
    Alert,
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
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ASSIGNABLE_ROLES = [
    'ORGANIZATION_ADMIN',
    'ADMIN',
    'RISK_MANAGER',
    'COMPLIANCE_OFFICER',
    'ASSESSOR',
    'APPROVER',
    'BUSINESS_OWNER',
    'AUDITOR',
    'VIEWER',
];

type OrgUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastLogin?: string | null;
};

type Invitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
};

export default function UserManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('VIEWER');
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [userRes, inviteRes] = await Promise.all([usersAPI.getAll(), usersAPI.invitations()]);
            setUsers(userRes.data.data || []);
            setInvitations(inviteRes.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const invite = async (event: FormEvent) => {
        event.preventDefault();
        setBusyId('invite');
        setMessage(null);
        try {
            const response = await usersAPI.invite({ email, role });
            const emailStatus = response.data.data?.emailStatus;
            setMessage(
                emailStatus && emailStatus !== 'CONNECTED'
                    ? `Invitation created. Email is ${emailStatus}. The invitee will not receive mail until a provider is configured.`
                    : `Invitation sent to ${email}.`
            );
            setEmail('');
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const changeRole = async (id: string, nextRole: string) => {
        setBusyId(id);
        setError(null);
        try {
            await usersAPI.updateRole(id, nextRole);
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const setStatus = async (id: string, status: 'ACTIVE' | 'DISABLED') => {
        setBusyId(id);
        setError(null);
        try {
            await usersAPI.setStatus(id, status);
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const revoke = async (id: string) => {
        setBusyId(id);
        setError(null);
        try {
            await usersAPI.revokeInvitation(id);
            setMessage('Invitation revoked.');
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const resend = async (id: string) => {
        setBusyId(id);
        setError(null);
        try {
            const response = await usersAPI.resendInvitation(id);
            const emailStatus = response.data.data?.emailStatus;
            setMessage(
                emailStatus && emailStatus !== 'CONNECTED'
                    ? `Invitation updated. Email is ${emailStatus}.`
                    : 'Invitation resent.'
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Box sx={{ maxWidth: 1100 }}>
            <Typography variant="overline" sx={{ color: '#f43f5e', fontWeight: 800, letterSpacing: '0.14em' }}>
                Administration
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Users and roles</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Tenant-scoped identity. Platform roles cannot be assigned from this screen.
            </Typography>
            {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
            <Card sx={{ mb: 3, bgcolor: 'rgba(15,23,42,0.85)' }}>
                <CardContent>
                    <Box component="form" onSubmit={invite}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField required type="email" label="Invite email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ minWidth: 280 }} />
                            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 220 }}>
                                {ASSIGNABLE_ROLES.map((item) => (
                                    <MenuItem key={item} value={item}>{item}</MenuItem>
                                ))}
                            </TextField>
                            <Button type="submit" variant="contained" disabled={!email || busyId === 'invite'}>Invite user</Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
            <QueryState loading={loading} error={error} empty={users.length === 0} emptyTitle="No users" emptyBody="Users in this organization will appear here.">
                <Card sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                    <CardContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Access</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((row) => {
                                    const self = row.id === user?.id;
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <Typography fontWeight={700}>{row.name || row.email}</Typography>
                                                <Typography variant="caption" color="text.secondary">{row.email}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    select
                                                    size="small"
                                                    value={ASSIGNABLE_ROLES.includes(row.role) ? row.role : row.role}
                                                    disabled={self || busyId === row.id || row.role === 'SUPERADMIN' || row.role === 'PLATFORM_ADMIN'}
                                                    onChange={(e) => changeRole(row.id, e.target.value)}
                                                    sx={{ minWidth: 220 }}
                                                >
                                                    {(ASSIGNABLE_ROLES.includes(row.role) ? ASSIGNABLE_ROLES : [row.role, ...ASSIGNABLE_ROLES]).map((item) => (
                                                        <MenuItem key={item} value={item}>{item}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </TableCell>
                                            <TableCell><Chip size="small" label={row.status} /></TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    disabled={self || busyId === row.id}
                                                    onClick={() => setStatus(row.id, row.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED')}
                                                >
                                                    {row.status === 'DISABLED' ? 'Activate' : 'Deactivate'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </QueryState>
            {invitations.length > 0 && (
                <Card sx={{ mt: 3, bgcolor: 'rgba(15,23,42,0.85)' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>Pending invitations</Typography>
                        {invitations.map((inviteRow) => (
                            <Stack key={inviteRow.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1 }}>
                                <Typography sx={{ flex: 1 }}>{inviteRow.email}</Typography>
                                <Chip size="small" label={inviteRow.role} />
                                <Chip size="small" label={inviteRow.status} />
                                <Button size="small" disabled={inviteRow.status !== 'PENDING' || busyId === inviteRow.id} onClick={() => resend(inviteRow.id)}>
                                    Resend
                                </Button>
                                <Button size="small" color="warning" disabled={inviteRow.status !== 'PENDING' || busyId === inviteRow.id} onClick={() => revoke(inviteRow.id)}>
                                    Revoke
                                </Button>
                            </Stack>
                        ))}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
