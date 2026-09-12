import { useEffect, useState } from 'react';
import { Button, MenuItem, TextField, Typography } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, Panel } from '../ui';

function useList(loader: () => Promise<{ data: { data: unknown } }>) {
    const [rows, setRows] = useState<unknown[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const reload = () => {
        setLoading(true);
        loader()
            .then((response) => setRows(response.data.data as unknown[]))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };
    useEffect(() => { reload(); }, []);
    return { rows, error, loading, reload };
}

export function PlatformIncidents() {
    const { rows, error, loading, reload } = useList(platformAPI.incidents);
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    return (
        <QueryState loading={loading} error={error}>
            <Panel title="Open and recent incidents">
                {rows.length === 0 ? <EmptyState>No active incidents.</EmptyState> : (rows as Array<Record<string, string>>).map((row) => (
                    <Typography key={row.id}>{row.displayId} · {row.severity} · {row.status} · {row.title}{row.securityIncident ? ' · SECURITY' : ''}</Typography>
                ))}
            </Panel>
            <Panel title="Record incident">
                <TextField fullWidth label="Title" value={title} onChange={(event) => setTitle(event.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth multiline minRows={2} label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} sx={{ mb: 2 }} />
                <Button variant="contained" onClick={() => platformAPI.createIncident({ title, summary, severity: 'P2' }).then(() => { setTitle(''); setSummary(''); reload(); })}>
                    Create incident
                </Button>
            </Panel>
        </QueryState>
    );
}

export function PlatformLeads() {
    const { rows, error, loading, reload } = useList(platformAPI.leads);
    return (
        <QueryState loading={loading} error={error}>
            {rows.length === 0 ? <EmptyState>No demo requests recorded.</EmptyState> : (rows as Array<Record<string, string>>).map((row) => (
                <Panel key={row.id} title={row.company}>
                    <Typography>{row.name} · {row.email} · {row.selectedPlan || 'no plan'} · {row.intent} · {row.source || 'direct'}</Typography>
                    <Typography>Sales notification {row.salesNotification} · Acknowledgement {row.prospectAcknowledgement}</Typography>
                    <TextField
                        select
                        size="small"
                        label="Lead status"
                        value={row.leadStatus}
                        onChange={(event) => platformAPI.updateLead(row.id, { leadStatus: event.target.value }).then(reload)}
                        sx={{ mt: 1, minWidth: 200 }}
                    >
                        {['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'QUALIFIED', 'CONVERTED', 'NOT_A_FIT', 'CLOSED'].map((value) => (
                            <MenuItem key={value} value={value}>{value}</MenuItem>
                        ))}
                    </TextField>
                </Panel>
            ))}
        </QueryState>
    );
}

export function PlatformBilling() {
    const { rows, error, loading } = useList(platformAPI.billing);
    return (
        <QueryState loading={loading} error={error}>
            {rows.length === 0 ? <EmptyState>No billing issues detected.</EmptyState> : (rows as Array<Record<string, string>>).map((row) => (
                <Typography key={row.id}>{row.name} · {row.plan} · {row.subscriptionStatus || row.status} · {row.billingInterval || '—'} · customer {row.stripeCustomerRef || '—'}</Typography>
            ))}
        </QueryState>
    );
}

export function PlatformProviders() {
    const [data, setData] = useState<Record<string, string> | null>(null);
    const [malware, setMalware] = useState<Array<Record<string, string>>>([]);
    const [notes, setNotes] = useState<Array<Record<string, string>>>([]);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        Promise.all([platformAPI.providers(), platformAPI.malware(), platformAPI.notifications()])
            .then(([providers, scans, failures]) => {
                setData(providers.data.data);
                setMalware(failures ? scans.data.data : []);
                setNotes(failures.data.data);
            })
            .catch((err) => setError(err.message));
    }, []);
    return (
        <QueryState loading={!data && !error} error={error}>
            <Panel title="Authoritative provider states">
                {data && Object.entries(data).filter(([key]) => typeof data[key] !== 'object' || data[key] === null).map(([key, value]) => (
                    <Typography key={key}>{key}: {String(value)}</Typography>
                ))}
            </Panel>
            <Panel title="Malware / evidence operations">
                {malware.length === 0 ? <EmptyState>No failed, infected, or pending evidence objects recorded.</EmptyState> : malware.map((row) => (
                    <Typography key={row.id}>{row.scanStatus} · {row.filename} · org {row.organizationId}</Typography>
                ))}
            </Panel>
            <Panel title="Notification failures">
                {notes.length === 0 ? <EmptyState>No notification failures recorded.</EmptyState> : notes.map((row) => (
                    <Typography key={row.id}>{row.eventType} · {row.status} · {row.recipientMask || '—'}</Typography>
                ))}
            </Panel>
        </QueryState>
    );
}

export function PlatformAudit() {
    const { rows, error, loading } = useList(platformAPI.audit);
    return (
        <QueryState loading={loading} error={error}>
            {rows.length === 0 ? <EmptyState>No platform audit events recorded.</EmptyState> : (rows as Array<Record<string, string>>).map((row) => (
                <Typography key={row.id}>{row.timestamp} · {row.action} · {row.resourceType} · actor {(row.actor as { email?: string } | undefined)?.email || row.actorUserId}</Typography>
            ))}
        </QueryState>
    );
}

export function PlatformUsers() {
    const { rows, error, loading } = useList(platformAPI.users);
    return (
        <QueryState loading={loading} error={error}>
            {rows.length === 0 ? <EmptyState>No authorized Supreme internal staff found.</EmptyState> : (rows as Array<Record<string, string>>).map((row) => (
                <Typography key={row.id}>{row.firstName} {row.lastName} · {row.email} · {row.role} · {row.status}</Typography>
            ))}
        </QueryState>
    );
}

export function PlatformSessions() {
    const { rows, error, loading, reload } = useList(platformAPI.sessions);
    const [organizationId, setOrganizationId] = useState('');
    const [reason, setReason] = useState('');
    return (
        <QueryState loading={loading} error={error}>
            <Panel title="Active and requested sessions">
                {rows.length === 0 ? <EmptyState>No support access sessions.</EmptyState> : (rows as Array<Record<string, string>>).map((row) => (
                    <BoxRow key={row.id} row={row} onApprove={() => platformAPI.approveSession(row.id).then(reload)} onStart={() => platformAPI.startSession(row.id).then(reload)} onRevoke={() => platformAPI.revokeSession(row.id).then(reload)} />
                ))}
            </Panel>
            <Panel title="Request support access">
                <TextField fullWidth label="Organization ID" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} sx={{ mb: 2 }} />
                <Button variant="contained" onClick={() => platformAPI.requestSession({ organizationId, reason, accessLevel: 'READ_ONLY', durationMinutes: 30 }).then(() => { setReason(''); reload(); })}>
                    Request read-only session
                </Button>
            </Panel>
        </QueryState>
    );
}

function BoxRow({ row, onApprove, onStart, onRevoke }: { row: Record<string, string>; onApprove: () => void; onStart: () => void; onRevoke: () => void }) {
    return (
        <Typography sx={{ mb: 1 }}>
            {row.status} · {row.accessLevel} · {(row.organization as { name?: string } | undefined)?.name || row.organizationId} · {row.reason}
            {' '}
            <Button size="small" onClick={onApprove}>Approve</Button>
            <Button size="small" onClick={onStart}>Start</Button>
            <Button size="small" onClick={onRevoke}>Revoke</Button>
        </Typography>
    );
}
