import { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tenantSupportAPI } from '../platform/api';

const CATEGORIES = [
    ['ACCESS', 'Access / login'],
    ['ASSESSMENT', 'Assessment'],
    ['EVIDENCE', 'Evidence'],
    ['MALWARE', 'Malware / upload'],
    ['FINDINGS', 'Findings / CAP'],
    ['REPORTS', 'Reports'],
    ['BILLING', 'Billing'],
    ['NOTIFICATIONS', 'Notifications'],
    ['INTEGRATION', 'Integration'],
    ['PERFORMANCE', 'Performance'],
    ['SECURITY', 'Security'],
    ['HOW_TO', 'How-to'],
    ['FEATURE_REQUEST', 'Feature request'],
    ['OTHER', 'Other'],
];

const FEEDBACK_KINDS = [
    ['BUG', 'Bug'],
    ['UX', 'UX / confusion'],
    ['FEATURE', 'Feature request'],
    ['SECURITY', 'Security concern'],
    ['PERFORMANCE', 'Performance problem'],
    ['DOCUMENTATION', 'Documentation issue'],
];

export default function HelpSupport() {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('OTHER');
    const [kind, setKind] = useState('BUG');
    const [workflow, setWorkflow] = useState('');
    const [priority, setPriority] = useState('P3');
    const [evidenceObjectId, setEvidenceObjectId] = useState('');
    const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([]);
    const [accessRequests, setAccessRequests] = useState<Array<Record<string, unknown>>>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        Promise.all([tenantSupportAPI.list(), tenantSupportAPI.accessRequests()])
            .then(([ticketRes, accessRes]) => {
                setTickets(ticketRes.data.data);
                setAccessRequests(accessRes.data.data);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <Box sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ letterSpacing: '0.12em' }}>Help & Support</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Get help</Typography>
            <Typography sx={{ color: 'text.secondary', mb: 3 }}>
                Submit a support request or private-beta feedback. We will review it and follow up. No contractual response time is promised.
                Optional screenshots must already be CLEAN evidence in this tenant — uploads cannot bypass malware scanning.
            </Typography>
            <TextField fullWidth label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} sx={{ mb: 2 }} />
            <TextField select fullWidth label="Feedback type" value={kind} onChange={(event) => setKind(event.target.value)} sx={{ mb: 2 }}>
                {FEEDBACK_KINDS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Page or workflow" value={workflow} onChange={(event) => setWorkflow(event.target.value)} sx={{ mb: 2 }} helperText="Example: Vendor offboarding, Assessment scoring" />
            <TextField select fullWidth label="Category" value={category} onChange={(event) => setCategory(event.target.value)} sx={{ mb: 2 }}>
                {CATEGORIES.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Suggested urgency" value={priority} onChange={(event) => setPriority(event.target.value)} sx={{ mb: 2 }} helperText="Supreme may reclassify urgency after review. P1 is treated as a security or workflow-blocking report.">
                <MenuItem value="P1">Critical / High — security, data loss, or product unusable</MenuItem>
                <MenuItem value="P2">High — I cannot complete a material workflow</MenuItem>
                <MenuItem value="P3">Normal</MenuItem>
                <MenuItem value="P4">Request / how-to</MenuItem>
            </TextField>
            <TextField
                fullWidth
                label="CLEAN evidence object ID (optional)"
                value={evidenceObjectId}
                onChange={(event) => setEvidenceObjectId(event.target.value)}
                sx={{ mb: 2 }}
                helperText="Reference an already-scanned CLEAN file in this organization. New uploads cannot bypass malware scanning."
            />
            <TextField fullWidth multiline minRows={4} label="Description" value={description} onChange={(event) => setDescription(event.target.value)} sx={{ mb: 2 }} />
            <Button
                variant="contained"
                onClick={() => {
                    tenantSupportAPI.create({
                        subject,
                        description,
                        category,
                        kind,
                        workflow,
                        perceivedSeverity: priority,
                        priority,
                        evidenceObjectId: evidenceObjectId.trim() || undefined,
                        route: window.location.pathname,
                    }).then(() => {
                        setSubject('');
                        setDescription('');
                        setEvidenceObjectId('');
                        setMessage("Thank you. Your request was submitted. We'll review it and follow up.");
                        load();
                    }).catch((err) => setError(err.message));
                }}
            >
                Submit a support request
            </Button>
            {message && <Typography sx={{ mt: 2 }}>{message}</Typography>}
            <Typography variant="h5" sx={{ mt: 5, mb: 2 }}>Support access requests</Typography>
            {accessRequests.length === 0 ? (
                <Typography color="text.secondary">No pending or recent Supreme support access requests.</Typography>
            ) : accessRequests.map((row) => (
                <Box key={String(row.id)} sx={{ mb: 2, p: 2, bgcolor: 'rgba(15,23,42,0.7)', borderRadius: 1 }}>
                    <Typography fontWeight={700}>Supreme Support requests temporary access</Typography>
                    <Typography variant="body2">
                        Ticket: {(row.ticket as { ticketNumber?: number } | undefined)?.ticketNumber ? `SUP-${(row.ticket as { ticketNumber: number }).ticketNumber}` : '—'}
                    </Typography>
                    <Typography variant="body2">Reason: {String(row.reason)}</Typography>
                    <Typography variant="body2">Access: {String(row.accessLevel)} · Duration: {String(row.durationMinutes)} minutes</Typography>
                    <Typography variant="body2">Status: {String(row.customerDecision || row.status)}</Typography>
                    {row.status === 'REQUESTED' && (
                        <>
                            <Button sx={{ mr: 1, mt: 1 }} onClick={() => tenantSupportAPI.approveAccess(String(row.id)).then(load)}>Approve</Button>
                            <Button sx={{ mt: 1 }} onClick={() => tenantSupportAPI.denyAccess(String(row.id)).then(load)}>Deny</Button>
                        </>
                    )}
                    {(row.status === 'ACTIVE' || row.status === 'APPROVED') && (
                        <Button sx={{ mt: 1 }} onClick={() => tenantSupportAPI.revokeAccess(String(row.id)).then(load)}>Revoke access</Button>
                    )}
                </Box>
            ))}
            <Typography variant="h5" sx={{ mt: 5, mb: 2 }}>My requests</Typography>
            <QueryState loading={loading} error={error}>
                {tickets.length === 0 ? (
                    <Typography color="text.secondary">No support requests yet.</Typography>
                ) : tickets.map((ticket) => (
                    <Box key={String(ticket.id)} sx={{ mb: 2, p: 2, bgcolor: 'rgba(15,23,42,0.7)', borderRadius: 1 }}>
                        <Typography fontWeight={700}>{String(ticket.displayId)} · {String(ticket.subject)}</Typography>
                        <Typography variant="body2">{String(ticket.status)} · {String(ticket.priority)}</Typography>
                        {((ticket.messages || []) as Array<{ id: string; body: string; visibility: string }>).map((item) => (
                            <Typography key={item.id} sx={{ mt: 1 }}>{item.body}</Typography>
                        ))}
                    </Box>
                ))}
            </QueryState>
        </Box>
    );
}
