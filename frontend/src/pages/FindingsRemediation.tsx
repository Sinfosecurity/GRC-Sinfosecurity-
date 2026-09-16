import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Drawer, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import MetricCard from '../components/design/MetricCard';
import AppTable from '../components/design/AppTable';
import { tprmAPI, vendorAPI } from '../services/api';
import EntityRelationships from '../components/EntityRelationships';

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
    closureEvidence?: string | null;
    evidenceUrl?: string | null;
    closureEvidenceId?: string | null;
    evidenceId?: string | null;
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
    const [actionError, setActionError] = useState<string | null>(null);

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

    const filtered = vendorId ? findings.filter((row) => row.vendor?.id === vendorId) : findings;

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <PageHeader
                title="Findings"
                description="Remediate issues from assessments and monitoring. Severity uses tone plus a label — not color alone."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                <MetricCard label="Critical" value={findings.filter((row) => row.severity === 'CRITICAL').length} />
                <MetricCard label="High" value={findings.filter((row) => row.severity === 'HIGH').length} />
                <MetricCard label="Overdue" value={findings.filter((row) => row.targetRemediationDate && new Date(row.targetRemediationDate).getTime() < Date.now() && !['CLOSED', 'RISK_ACCEPTED', 'RESOLVED'].includes(row.status)).length} />
                <MetricCard label="Due soon" value={findings.filter((row) => {
                    if (!row.targetRemediationDate || ['CLOSED', 'RISK_ACCEPTED', 'RESOLVED'].includes(row.status)) return false;
                    const due = new Date(row.targetRemediationDate).getTime();
                    return due >= Date.now() && due <= Date.now() + 7 * 86400000;
                }).length} />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 220 }}>
                    <MenuItem value="">All vendors</MenuItem>
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
            <TextField fullWidth sx={{ mb: 3 }} label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <QueryState
                loading={loading}
                error={error}
                empty={filtered.length === 0}
                emptyTitle="No findings yet"
                emptyBody="When assessments or monitoring create issues — or you record one here — they appear with a remediation path."
            >
                <AppTable
                    rows={filtered}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => {
                        setSelected(row);
                        setCap(row.correctiveActionPlan || '');
                        setTarget(row.targetRemediationDate?.slice(0, 10) || '');
                    }}
                    searchPlaceholder="Search findings"
                    searchValue={(row) => `${row.title} ${row.vendor?.name || ''} ${row.status} ${row.severity}`}
                    columns={[
                        { id: 'title', label: 'Finding', sortValue: (row) => row.title, render: (row) => (
                            <Box>
                                <Typography variant="subtitle2">{row.title}</Typography>
                                <Typography variant="caption">{row.vendor?.name || 'Vendor'}</Typography>
                            </Box>
                        ) },
                        { id: 'severity', label: 'Severity', sortValue: (row) => row.severity, render: (row) => <StatusBadge value={row.severity} kind="severity" /> },
                        { id: 'status', label: 'Status', sortValue: (row) => row.status, render: (row) => <StatusBadge value={row.status} /> },
                        { id: 'owner', label: 'Owner', hideOnMobile: true, render: (row) => row.assignedTo || 'Unassigned' },
                        { id: 'due', label: 'Due', hideOnMobile: true, sortValue: (row) => row.targetRemediationDate || '', render: (row) => row.targetRemediationDate?.slice(0, 10) || '—' },
                    ]}
                />
            </QueryState>

            <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
                {selected && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="overline">Finding</Typography>
                        <Typography variant="h4" sx={{ mb: 1 }}>{selected.title}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <StatusBadge value={selected.severity} kind="severity" />
                            <StatusBadge value={selected.status} />
                        </Stack>
                        <Typography variant="body2" sx={{ mb: 2 }}>{selected.description}</Typography>
                        <Alert severity={selected.status === 'RISK_ACCEPTED' ? 'warning' : 'info'} sx={{ mb: 2 }}>
                            {selected.status === 'RISK_ACCEPTED'
                                ? 'Accepted here is a finding disposition. It does not change residual risk by itself.'
                                : 'Record a plan, then validate and close. History stays with the vendor.'}
                        </Alert>
                        <Stack spacing={2}>
                            <TextField label="Corrective action plan" multiline minRows={3} value={cap} onChange={(e) => setCap(e.target.value)} />
                            <TextField type="date" label="Target remediation" InputLabelProps={{ shrink: true }} value={target} onChange={(e) => setTarget(e.target.value)} />
                            <Button variant="contained" disabled={busy} onClick={saveCap}>Save remediation plan</Button>
                            <Button disabled={busy} onClick={async () => {
                                const updated = await tprmAPI.validateFinding(selected.id, { approved: true, validationNotes: 'Validated from findings workspace' });
                                setSelected(updated.data.data);
                                await load();
                            }}>Mark verification complete</Button>
                            <Button disabled={busy} onClick={async () => {
                                setActionError(null);
                                try {
                                    const updated = await tprmAPI.closeFinding(selected.id, {
                                        closureNotes: 'Closed from findings workspace',
                                        evidenceId: selected.closureEvidenceId || selected.closureEvidence || selected.evidenceId || selected.evidenceUrl,
                                    });
                                    setSelected(updated.data.data);
                                    await load();
                                } catch (err: any) {
                                    setActionError(err.message || 'This finding cannot be closed yet. Validated evidence is still required.');
                                }
                            }}>Close finding</Button>
                            {actionError && <Alert severity="warning">{actionError}</Alert>}
                            <EntityRelationships sourceModel="VendorIssue" sourceId={selected.id} />
                            <Button onClick={() => setSelected(null)}>Close panel</Button>
                        </Stack>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
}
