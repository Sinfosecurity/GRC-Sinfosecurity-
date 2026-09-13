import { FormEvent, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { deliveryLabel } from './invitationDelivery';

const ASSIGNABLE_ROLES = [
    { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin', description: 'Manages the organization, people, and Third Party settings.' },
    { value: 'RISK_MANAGER', label: 'Risk Manager', description: 'Owns residual risk, findings, and decisions.' },
    { value: 'ASSESSOR', label: 'Assessor', description: 'Completes assessments and attaches evidence.' },
    { value: 'APPROVER', label: 'Approver', description: 'Reviews assessments and records decisions.' },
    { value: 'VIEWER', label: 'Viewer', description: 'Can view records but cannot export or change work.' },
];

function roleLabel(role?: string) {
    return ASSIGNABLE_ROLES.find((item) => item.value === role)?.label
        || ({ ADMIN: 'Organization Admin', COMPLIANCE_OFFICER: 'Assessor', BUSINESS_OWNER: 'Business Owner', AUDITOR: 'Auditor', USER: 'Viewer' } as Record<string, string>)[role || '']
        || (role || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type OrgUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    roleLabel?: string;
    status: string;
    lastLogin?: string | null;
};

type Invitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    createdAt?: string;
    invitedByName?: string;
    emailDelivery?: string;
};

export default function UserManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('VIEWER');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [activationUrl, setActivationUrl] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [userRes, inviteRes] = await Promise.all([usersAPI.getAll(), usersAPI.invitations()]);
            setUsers(Array.isArray(userRes.data.data) ? userRes.data.data : []);
            setInvitations(Array.isArray(inviteRes.data.data) ? inviteRes.data.data : []);
        } catch (err: any) {
            setError(err.message || 'Unable to load the team.');
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
        setActivationUrl(null);
        try {
            const response = await usersAPI.invite({ email, role });
            const delivery = response.data.data?.delivery;
            const url = response.data.data?.activationUrl;
            setActivationUrl(delivery === 'failed' || delivery === 'unknown' ? url || null : null);
            setMessage(
                delivery === 'delivered'
                    ? 'Invitation created. The email was delivered.'
                    : delivery === 'sent'
                        ? 'Invitation created. The email was sent. Delivery confirmation is tracked separately.'
                        : delivery === 'bounced'
                            ? 'Invitation created, but the email bounced.'
                            : delivery === 'failed'
                                ? 'Invitation created. The email could not be sent. Copy the activation link and send it securely.'
                                : 'Invitation created.'
            );
            setEmail('');
            setInviteOpen(false);
            setTab(1);
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
            setMessage('Invitation revoked. The previous activation link will no longer work.');
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
            const delivery = response.data.data?.delivery;
            const url = response.data.data?.activationUrl;
            setActivationUrl(delivery === 'failed' || delivery === 'unknown' ? url || null : null);
            setMessage(
                delivery === 'sent' || delivery === 'delivered'
                    ? 'Invitation updated. A new email was sent. The previous activation link is no longer valid.'
                    : 'Invitation updated. The previous activation link is no longer valid.'
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const copyLink = async () => {
        if (!activationUrl) return;
        await navigator.clipboard.writeText(activationUrl);
        setMessage('Activation link copied. Share it only with the intended person.');
    };

    const pending = invitations.filter((row) => row.status === 'PENDING');
    const admins = users.filter((row) => ['ORGANIZATION_ADMIN', 'ADMIN'].includes(row.role) && row.status === 'ACTIVE');
    const selectedRole = ASSIGNABLE_ROLES.find((item) => item.value === role);

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <PageHeader
                title="Team"
                description="Manage who can access Supreme and what they can do."
                actions={<Button variant="contained" onClick={() => { setInviteOpen(true); setError(null); }}>Invite member</Button>}
            />
            {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
            {activationUrl && (
                <Alert severity="success" sx={{ mb: 2 }} action={<Button color="inherit" onClick={copyLink}>Copy activation link</Button>}>
                    A secure activation link is available for the latest invitation. It is not shown in the invitations list.
                </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <MetricCard label="Active users" value={users.filter((row) => row.status === 'ACTIVE').length} />
                <MetricCard label="Pending invitations" value={pending.length} />
                <MetricCard label="Admins" value={admins.length} />
            </Stack>

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Members" />
                <Tab label="Invitations" />
                <Tab label="Roles & permissions" />
            </Tabs>

            {tab === 0 && (
                <QueryState loading={loading} error={error} empty={users.length === 0} emptyTitle="No members yet" emptyBody="Invite someone to this organization.">
                    <AppTable
                        rows={users}
                        rowKey={(row) => row.id}
                        searchPlaceholder="Search members"
                        searchValue={(row) => `${row.name} ${row.email} ${row.role}`}
                        columns={[
                            { id: 'name', label: 'Name', sortValue: (row) => row.name, render: (row) => (
                                <Box>
                                    <Typography variant="subtitle2">{row.name || row.email}</Typography>
                                    <Typography variant="caption">{row.email}</Typography>
                                </Box>
                            ) },
                            { id: 'role', label: 'Role', render: (row) => (
                                <TextField
                                    select
                                    size="small"
                                    value={row.role}
                                    disabled={row.id === user?.id || busyId === row.id || ['SUPERADMIN', 'PLATFORM_ADMIN', 'PLATFORM_OWNER'].includes(row.role)}
                                    onChange={(e) => changeRole(row.id, e.target.value)}
                                    sx={{ minWidth: 200 }}
                                >
                                    {(ASSIGNABLE_ROLES.some((item) => item.value === row.role) ? ASSIGNABLE_ROLES : [{ value: row.role, label: roleLabel(row.role), description: '' }, ...ASSIGNABLE_ROLES]).map((item) => (
                                        <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                                    ))}
                                </TextField>
                            ) },
                            { id: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} kind="plain" /> },
                            { id: 'active', label: 'Last active', hideOnMobile: true, render: (row) => row.lastLogin ? row.lastLogin.slice(0, 10) : '—' },
                            { id: 'actions', label: 'Actions', render: (row) => (
                                <Button size="small" disabled={row.id === user?.id || busyId === row.id} onClick={() => setStatus(row.id, row.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED')}>
                                    {row.status === 'DISABLED' ? 'Activate' : 'Deactivate'}
                                </Button>
                            ) },
                        ]}
                    />
                </QueryState>
            )}

            {tab === 1 && (
                <QueryState loading={loading} error={error} empty={invitations.length === 0} emptyTitle="No invitations" emptyBody="Invitations appear here after you invite a member. A pending row is not proof that email arrived.">
                    <AppTable
                        rows={invitations}
                        rowKey={(row) => row.id}
                        searchPlaceholder="Search invitations"
                        searchValue={(row) => `${row.email} ${row.role} ${row.status}`}
                        columns={[
                            { id: 'email', label: 'Email', render: (row) => row.email },
                            { id: 'role', label: 'Role', render: (row) => roleLabel(row.role) },
                            { id: 'by', label: 'Invited by', hideOnMobile: true, render: (row) => row.invitedByName || '—' },
                            { id: 'when', label: 'Invited', hideOnMobile: true, render: (row) => row.createdAt?.slice(0, 10) || '—' },
                            { id: 'expires', label: 'Expires', hideOnMobile: true, render: (row) => row.expiresAt?.slice(0, 10) || '—' },
                            { id: 'delivery', label: 'Delivery', render: (row) => deliveryLabel(row.emailDelivery) },
                            { id: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} kind="plain" /> },
                            { id: 'actions', label: 'Actions', render: (row) => (
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" disabled={row.status !== 'PENDING' || busyId === row.id} onClick={() => resend(row.id)}>Resend</Button>
                                    <Button size="small" color="warning" disabled={row.status !== 'PENDING' || busyId === row.id} onClick={() => revoke(row.id)}>Revoke</Button>
                                </Stack>
                            ) },
                        ]}
                    />
                </QueryState>
            )}

            {tab === 2 && (
                <Stack spacing={1.5}>
                    {ASSIGNABLE_ROLES.map((item) => (
                        <Box key={item.value} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="subtitle1">{item.label}</Typography>
                            <Typography variant="body2">{item.description}</Typography>
                        </Box>
                    ))}
                </Stack>
            )}

            <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
                <Box component="form" onSubmit={invite}>
                    <DialogTitle>Invite member</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField required type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                                {ASSIGNABLE_ROLES.map((item) => (
                                    <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                                ))}
                            </TextField>
                            <Typography variant="body2">{selectedRole?.description}</Typography>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={!email || busyId === 'invite'}>Send invitation</Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Box>
    );
}
