import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI, vendorAPI } from '../services/api';

type Finding = {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    assignedTo?: string | null;
    targetRemediationDate?: string | null;
    correctiveActionPlan?: string | null;
    vendor?: { id: string; name: string };
    identifiedDate: string;
};

export default function FindingsRemediation() {
    const [searchParams] = useSearchParams();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [selected, setSelected] = useState<Finding | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('HIGH');
    const [cap, setCap] = useState('');
    const [target, setTarget] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [findingRes, vendorRes] = await Promise.all([tprmAPI.listFindings(), vendorAPI.getAll()]);
            setFindings(findingRes.data.data || []);
            const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
            setVendors(Array.isArray(vendorRows) ? vendorRows : []);
        } catch (err: any) {
            setError(err.message || 'Unable to load findings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const create = async () => {
        if (!vendorId || !title) return;
        setBusy(true);
        try {
            await tprmAPI.createFinding(vendorId, { title, description, severity, category: 'Security', issueType: 'AUDIT_FINDING' });
            setTitle('');
            setDescription('');
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const saveCap = async () => {
        if (!selected || !cap || !target) return;
        setBusy(true);
        try {
            const updated = await tprmAPI.updateFindingCap(selected.id, { correctiveActionPlan: cap, targetRemediationDate: new Date(target).toISOString() });
            setSelected(updated.data.data);
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <Typography variant="overline" sx={{ color: '#f87171', fontWeight: 800, letterSpacing: '0.14em' }}>
                Findings & Remediation
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Open issues across the vendor portfolio</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Findings are no longer buried inside a vendor record. Remediation plans, validation, and risk acceptance live here.
            </Typography>
            <Card sx={{ mb: 3, bgcolor: 'rgba(15,23,42,0.8)' }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 220 }}>
                            <MenuItem value="">Select vendor</MenuItem>
                            {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                                <MenuItem value={vendorId}>Selected vendor</MenuItem>
                            )}
                            {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                        </TextField>
                        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1 }} />
                        <TextField select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} sx={{ minWidth: 140 }}>
                            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </TextField>
                        <Button variant="contained" disabled={!vendorId || !title || busy} onClick={create}>Create finding</Button>
                    </Stack>
                    <TextField fullWidth sx={{ mt: 2 }} label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </CardContent>
            </Card>
            <QueryState loading={loading} error={error} empty={findings.length === 0} emptyTitle="No findings" emptyBody="When assessments or monitoring create issues, they appear here.">
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Card sx={{ flex: 1, bgcolor: 'rgba(15,23,42,0.85)' }}>
                        <CardContent>
                            {findings.map((finding) => (
                                <Box key={finding.id} onClick={() => { setSelected(finding); setCap(finding.correctiveActionPlan || ''); setTarget(finding.targetRemediationDate?.slice(0, 10) || ''); }} sx={{ py: 1.5, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip size="small" label={finding.severity} color={finding.severity === 'CRITICAL' ? 'error' : 'warning'} />
                                        <Typography fontWeight={700}>{finding.title}</Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        {finding.vendor?.name} · {finding.status} · {finding.assignedTo || 'unassigned'}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                    {selected && (
                        <Card sx={{ flex: 1, bgcolor: 'rgba(15,23,42,0.85)' }}>
                            <CardContent>
                                <Typography variant="h5">{selected.title}</Typography>
                                <Typography color="text.secondary" sx={{ my: 1 }}>{selected.description}</Typography>
                                <Alert severity={selected.status === 'RISK_ACCEPTED' ? 'warning' : 'info'} sx={{ mb: 2 }}>
                                    Status {selected.status}. Risk acceptance here is a finding disposition, not a residual-score control.
                                </Alert>
                                <Stack spacing={2}>
                                    <TextField label="Corrective action plan" multiline minRows={3} value={cap} onChange={(e) => setCap(e.target.value)} />
                                    <TextField type="date" label="Target remediation" InputLabelProps={{ shrink: true }} value={target} onChange={(e) => setTarget(e.target.value)} />
                                    <Button variant="contained" disabled={busy} onClick={saveCap}>Save remediation plan</Button>
                                    <Button disabled={busy} onClick={async () => {
                                        const updated = await tprmAPI.validateFinding(selected.id, { approved: true, validationNotes: 'Validated from findings workspace' });
                                        setSelected(updated.data.data);
                                        await load();
                                    }}>Validate remediation</Button>
                                    <Button disabled={busy} onClick={async () => {
                                        const updated = await tprmAPI.closeFinding(selected.id, { closureNotes: 'Closed from findings workspace' });
                                        setSelected(updated.data.data);
                                        await load();
                                    }}>Close finding</Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            </QueryState>
        </Box>
    );
}
