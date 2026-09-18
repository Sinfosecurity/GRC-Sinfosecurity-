import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import FormSection from '../components/design/FormSection';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import AttentionStrip from '../components/design/AttentionStrip';
import { tprmAPI, vendorAPI } from '../services/api';
import FindingWorkspaceDrawer from './FindingWorkspaceDrawer';
import { humanizeLabel } from '../utils/humanizeLabel';

type Finding = {
    id: string;
    title: string;
    displayTitle?: string;
    originalTitle?: string;
    description: string;
    severity: string;
    status: string;
    assignedTo?: string | null;
    targetRemediationDate?: string | null;
    vendor?: { id: string; name: string };
    identifiedDate: string;
    sourceKind?: string;
    sourceLabel?: string;
    overdue?: boolean;
};

export default function FindingsRemediation() {
    const [searchParams] = useSearchParams();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [createVendorId, setCreateVendorId] = useState(searchParams.get('vendorId') || '');
    const [statusFilter, setStatusFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('HIGH');
    const [responsibility, setResponsibility] = useState('INTERNAL');
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
        if (!createVendorId || !title || !description.trim()) return;
        setBusy(true);
        try {
            await tprmAPI.createFinding(createVendorId, {
                title,
                description: description.trim(),
                severity,
                category: 'Security',
                issueType: 'AUDIT_FINDING',
                source: 'OTHER',
                responsibility,
            });
            setTitle('');
            setDescription('');
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const now = Date.now();
    const closed = new Set(['CLOSED', 'RISK_ACCEPTED', 'RESOLVED']);
    const critical = findings.filter((row) => row.severity === 'CRITICAL').length;
    const high = findings.filter((row) => row.severity === 'HIGH').length;
    const overdue = findings.filter((row) => row.overdue || (row.targetRemediationDate && new Date(row.targetRemediationDate).getTime() < now && !closed.has(row.status))).length;
    const dueSoon = findings.filter((row) => {
        if (!row.targetRemediationDate || closed.has(row.status)) return false;
        const due = new Date(row.targetRemediationDate).getTime();
        return due >= now && due <= now + 7 * 86400000;
    }).length;
    const filtered = findings.filter((row) => {
        if (vendorId && row.vendor?.id !== vendorId) return false;
        if (statusFilter && row.status !== statusFilter) return false;
        if (severityFilter && row.severity !== severityFilter) return false;
        if (sourceFilter && row.sourceKind !== sourceFilter) return false;
        if (overdueOnly && !(row.overdue || (row.targetRemediationDate && new Date(row.targetRemediationDate).getTime() < now && !closed.has(row.status)))) return false;
        return true;
    });

    const ageDays = (iso?: string) => {
        if (!iso) return '—';
        const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
        return days === 0 ? 'Today' : `${days}d`;
    };

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                crumbs={[{ label: 'Work' }, { label: 'Findings' }]}
                title="Findings"
                description="Each finding is a self-contained governance record. Open one to see source, observed condition, evidence, and the next action."
            />
            <Box sx={{ mb: 2 }}>
                <AttentionStrip items={[
                    { label: 'Critical', value: critical },
                    { label: 'High', value: high },
                    { label: 'Overdue', value: overdue },
                    { label: 'Due soon', value: dueSoon },
                ]} />
            </Box>
            <Surface>
                <FormSection title="Record a manual finding" body="Use this when an issue is not already created by an assessment or monitoring signal. Do not reuse questionnaire wording unless that is what was observed.">
                    <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField select label="Affected vendor" value={createVendorId} onChange={(e) => setCreateVendorId(e.target.value)} sx={{ minWidth: 220 }}>
                                <MenuItem value="">Select vendor</MenuItem>
                                {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                            </TextField>
                            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1 }} />
                            <TextField select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} sx={{ minWidth: 140 }}>
                                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                            </TextField>
                            <TextField select label="Responsibility" value={responsibility} onChange={(e) => setResponsibility(e.target.value)} sx={{ minWidth: 180 }}>
                                <MenuItem value="INTERNAL">Internal</MenuItem>
                                <MenuItem value="VENDOR">Vendor</MenuItem>
                                <MenuItem value="SHARED">Shared</MenuItem>
                            </TextField>
                            <Button variant="contained" disabled={!createVendorId || !title || !description.trim() || busy} onClick={create}>Create finding</Button>
                        </Stack>
                        <TextField fullWidth label="What was observed and why this is a finding" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </Stack>
                </FormSection>
            </Surface>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2, mb: 1.5 }}>
                <TextField select label="Filter by vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="">All vendors</MenuItem>
                    {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                        <MenuItem value={vendorId}>Selected vendor</MenuItem>
                    )}
                    {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                </TextField>
                <TextField select label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
                    <MenuItem value="">All statuses</MenuItem>
                    {Array.from(new Set(findings.map((row) => row.status))).map((value) => (
                        <MenuItem key={value} value={value}>{humanizeLabel(value)}</MenuItem>
                    ))}
                </TextField>
                <TextField select label="Filter by severity" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} sx={{ minWidth: 160 }}>
                    <MenuItem value="">All severities</MenuItem>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </TextField>
                <TextField select label="Filter by source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} sx={{ minWidth: 180 }}>
                    <MenuItem value="">All sources</MenuItem>
                    {Array.from(new Set(findings.map((row) => row.sourceKind).filter(Boolean))).map((value) => (
                        <MenuItem key={value} value={value}>{humanizeLabel(value)}</MenuItem>
                    ))}
                </TextField>
                <TextField select label="Due" value={overdueOnly ? 'overdue' : ''} onChange={(e) => setOverdueOnly(e.target.value === 'overdue')} sx={{ minWidth: 140 }}>
                    <MenuItem value="">All dates</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                </TextField>
            </Stack>
            <Box sx={{ mt: 2 }}>
            <QueryState
                loading={loading}
                error={error}
                empty={filtered.length === 0}
                emptyTitle="No findings yet"
                emptyBody="When assessments or monitoring create issues — or you record one here — they appear with source and a next action."
            >
                <Surface padded={false}>
                <AppTable
                    embedded
                    pageSize={12}
                    rows={filtered}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => setSelectedId(row.id)}
                    searchPlaceholder="Search findings"
                    searchValue={(row) => `${row.displayTitle || row.title} ${row.vendor?.name || ''} ${row.status} ${row.severity} ${row.sourceLabel || ''}`}
                    columns={[
                        { id: 'title', label: 'Finding', sortValue: (row) => row.displayTitle || row.title, render: (row) => (
                            <Box>
                                <Typography variant="subtitle2">{row.displayTitle || row.title}</Typography>
                                <Typography variant="caption">{row.vendor?.name || 'Affected record'} · {row.sourceLabel || humanizeLabel(row.sourceKind || 'MANUAL')}</Typography>
                            </Box>
                        ) },
                        { id: 'source', label: 'Source', hideOnMobile: true, sortValue: (row) => row.sourceKind || '', render: (row) => humanizeLabel(row.sourceKind || 'MANUAL') },
                        { id: 'severity', label: 'Severity', sortValue: (row) => row.severity, render: (row) => <StatusBadge value={row.severity} kind="severity" /> },
                        { id: 'status', label: 'Status', sortValue: (row) => row.status, render: (row) => <StatusBadge value={row.status} /> },
                        { id: 'owner', label: 'Owner', hideOnMobile: true, render: (row) => row.assignedTo || 'Unassigned' },
                        { id: 'age', label: 'Age / due', hideOnMobile: true, sortValue: (row) => row.targetRemediationDate || row.identifiedDate, render: (row) => row.targetRemediationDate?.slice(0, 10) || ageDays(row.identifiedDate) },
                    ]}
                />
                </Surface>
            </QueryState>
            </Box>
            <FindingWorkspaceDrawer issueId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
        </WorkspaceFrame>
    );
}
