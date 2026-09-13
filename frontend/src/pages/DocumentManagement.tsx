import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import { sccAPI, tprmAPI, vendorAPI } from '../services/api';
import EntityRelationships from '../components/EntityRelationships';

type Stored = {
    id: string;
    filename: string;
    ownerType: string;
    ownerId: string;
    scanStatus: string;
    classification?: string;
    uploadedAt: string;
    size?: number;
};

type Reusable = {
    id: string;
    filename: string;
    ownerType: string;
    ownerId: string;
    scanStatus: string;
    uploadedAt: string;
    usable: boolean;
    reuseCount: number;
    linkedControls: number;
    freshness: string;
};

function scanTone(status: string): 'success' | 'critical' | 'high' | 'neutral' {
    if (status === 'CLEAN') return 'success';
    if (status === 'INFECTED') return 'critical';
    if (status === 'PENDING' || status === 'FAILED' || status === 'NOT_CONFIGURED' || status === 'ERROR') return 'high';
    return 'neutral';
}

export default function DocumentManagement() {
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState<Stored[]>([]);
    const [reusable, setReusable] = useState<Reusable[]>([]);
    const [storageStatus, setStorageStatus] = useState('NOT_CONFIGURED');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [controls, setControls] = useState<Array<{ id: string; controlKey: string; title: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [uploading, setUploading] = useState(false);
    const [scanFilter, setScanFilter] = useState('');
    const [freshnessFilter, setFreshnessFilter] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [controlId, setControlId] = useState('');
    const [relationship, setRelationship] = useState('SUPPORTS');
    const [rationale, setRationale] = useState('');
    const [impact, setImpact] = useState<any>(null);

    const load = () => {
        setLoading(true);
        Promise.all([tprmAPI.evidence(), vendorAPI.getAll(), sccAPI.evidence(), sccAPI.controls()])
            .then(([response, vendorRes, reuseRes, controlRes]) => {
                setItems(response.data.data.items || []);
                setStorageStatus(response.data.data.storage?.provider || response.data.data.storage?.status || 'UNKNOWN');
                const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
                setVendors(Array.isArray(vendorRows) ? vendorRows : []);
                setReusable(reuseRes.data.data || []);
                setControls(controlRes.data.data || []);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const library = useMemo(() => reusable.filter((row) => {
        if (scanFilter && row.scanStatus !== scanFilter) return false;
        if (freshnessFilter && row.freshness !== freshnessFilter) return false;
        return true;
    }), [reusable, scanFilter, freshnessFilter]);

    const linkExisting = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId || !controlId) return;
        setError(null);
        try {
            await sccAPI.linkEvidence({
                storedObjectId: selectedId,
                targetType: 'CONTROL',
                targetId: controlId,
                relationship,
                rationale,
            });
            setRationale('');
            load();
        } catch (err: any) {
            setError(err.message || 'Unable to link evidence');
        }
    };

    const showImpact = async (id: string) => {
        setSelectedId(id);
        try {
            const response = await sccAPI.impact(id);
            setImpact(response.data.data);
        } catch {
            setImpact(null);
        }
    };

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Evidence Library' }]}
                title="Evidence Library"
                description="Upload once. Reuse with an explicit rationale. Only files with a CLEAN malware scan can be treated as usable evidence."
                meta={<StatusBadge kind="plain" tone={storageStatus === 'NOT_CONFIGURED' ? 'high' : 'info'} label={storageStatus === 'NOT_CONFIGURED' ? 'Storage not ready' : 'Storage ready'} />}
            />
            <Alert severity="info" sx={{ mb: 2, display: { xs: 'none', md: 'flex' } }}>
                Linking a file to one control does not prove every mapped requirement. Expired or revoked evidence shows potential governance impact and does not change residual scores.
            </Alert>
            <Typography variant="caption" display="block" sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                Reuse a CLEAN file. Linking one control does not prove every mapped requirement.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField select label="Link upload to vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: { md: 280 }, width: { xs: '100%', md: 'auto' } }}>
                    <MenuItem value="">Select vendor</MenuItem>
                    {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                        <MenuItem value={vendorId}>Selected vendor</MenuItem>
                    )}
                    {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                </TextField>
                <Button component="label" variant="contained" disabled={!vendorId || uploading}>
                    {uploading ? 'Uploading…' : 'Upload evidence'}
                    <input hidden type="file" onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file || !vendorId) return;
                        setUploading(true);
                        setError(null);
                        try {
                            const form = new FormData();
                            form.append('file', file);
                            form.append('vendorId', vendorId);
                            await tprmAPI.uploadEvidence(form);
                            load();
                        } catch (err: any) {
                            setError(err.message || 'Upload failed');
                        } finally {
                            setUploading(false);
                        }
                    }} />
                </Button>
            </Stack>
            {!vendorId && (
                <Alert severity="info" sx={{ mb: 2, display: { xs: 'none', sm: 'flex' } }}>
                    Select a vendor so a new file is stored and linked atomically. Prefer “Use existing evidence” when the file is already here.
                </Alert>
            )}

            <Surface>
                <Typography variant="h5" sx={{ mb: 1 }}>Use existing evidence</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>Search CLEAN files already in this organization before asking for another upload.</Typography>
                <Box component="form" onSubmit={linkExisting}>
                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField select label="Existing file" value={selectedId} onChange={(e) => showImpact(e.target.value)} sx={{ minWidth: { md: 280 }, width: { xs: '100%', md: 'auto' } }}>
                                <MenuItem value="">Select file</MenuItem>
                                {library.map((row) => (
                                    <MenuItem key={row.id} value={row.id} disabled={!row.usable}>
                                        {row.filename} · {row.scanStatus} · {row.freshness} · reused {row.reuseCount}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField select label="Control" value={controlId} onChange={(e) => setControlId(e.target.value)} sx={{ minWidth: { md: 280 }, width: { xs: '100%', md: 'auto' } }}>
                                <MenuItem value="">Select control</MenuItem>
                                {controls.map((row) => <MenuItem key={row.id} value={row.id}>{row.controlKey} {row.title}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <TextField select label="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} sx={{ minWidth: { md: 220 }, width: { xs: '100%', md: 'auto' } }}>
                            <MenuItem value="SUPPORTS">Supports</MenuItem>
                            <MenuItem value="PARTIALLY_SUPPORTS">Partially supports</MenuItem>
                            <MenuItem value="RELATED_TO">Related to</MenuItem>
                            <MenuItem value="CONTRADICTS">Contradicts</MenuItem>
                        </TextField>
                        <TextField label="Why this file supports this control" value={rationale} onChange={(e) => setRationale(e.target.value)} required multiline minRows={2} sx={{ '& textarea': { minHeight: { xs: 56, sm: 72 } } }} />
                        <Button type="submit" variant="contained" disabled={!selectedId || !controlId}>Link existing evidence</Button>
                    </Stack>
                </Box>
                {impact && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Potential governance impact for {impact.filename}: {impact.potentialImpact.controls.length} controls, {impact.potentialImpact.requirements.length} requirements, {impact.potentialImpact.vendors.length} vendors. Residual scores are unchanged.
                    </Alert>
                )}
            </Surface>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ my: 2 }}>
                <TextField select label="Malware status" value={scanFilter} onChange={(e) => setScanFilter(e.target.value)} sx={{ minWidth: { sm: 200 }, width: { xs: '100%', sm: 'auto' } }}>
                    <MenuItem value="">Any scan status</MenuItem>
                    {['CLEAN', 'PENDING', 'FAILED', 'INFECTED', 'ERROR', 'NOT_CONFIGURED'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </TextField>
                <TextField select label="Freshness" value={freshnessFilter} onChange={(e) => setFreshnessFilter(e.target.value)} sx={{ minWidth: { sm: 200 }, width: { xs: '100%', sm: 'auto' } }}>
                    <MenuItem value="">Any freshness</MenuItem>
                    {['CURRENT', 'EXPIRING', 'EXPIRED', 'SUPERSEDED', 'REVOKED', 'UNDER_REVIEW'].map((value) => <MenuItem key={value} value={value}>{value.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
            </Stack>

            <QueryState
                loading={loading}
                error={error}
                empty={items.length === 0}
                emptyTitle="No evidence uploaded"
                emptyBody="Uploads appear here with classification and malware scan status. Reuse a CLEAN file before asking for another copy."
            >
                <AppTable
                    rows={items}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => showImpact(row.id)}
                    searchPlaceholder="Search evidence"
                    searchValue={(row) => `${row.filename} ${row.classification || ''} ${row.scanStatus}`}
                    columns={[
                        { id: 'file', label: 'File', sortValue: (row) => row.filename, render: (row) => (
                            <Box>
                                <Typography variant="subtitle2">{row.filename}</Typography>
                                <Typography variant="caption">{row.ownerType} · {row.classification || 'stored object'}</Typography>
                            </Box>
                        ) },
                        { id: 'scan', label: 'Scan', sortValue: (row) => row.scanStatus, render: (row) => (
                            <StatusBadge kind="plain" tone={scanTone(row.scanStatus)} label={row.scanStatus} />
                        ) },
                        { id: 'reuse', label: 'Reuse', hideOnMobile: true, sortValue: (row) => reusable.find((item) => item.id === row.id)?.reuseCount || 0, render: (row) => reusable.find((item) => item.id === row.id)?.reuseCount ?? 0 },
                        { id: 'fresh', label: 'Freshness', hideOnMobile: true, sortValue: (row) => reusable.find((item) => item.id === row.id)?.freshness || '', render: (row) => reusable.find((item) => item.id === row.id)?.freshness || '—' },
                        { id: 'size', label: 'Size', hideOnMobile: true, sortValue: (row) => row.size || 0, render: (row) => row.size ? `${row.size} bytes` : '—' },
                        { id: 'when', label: 'Uploaded', hideOnMobile: true, sortValue: (row) => row.uploadedAt, render: (row) => row.uploadedAt?.slice(0, 10) || '—' },
                    ]}
                />
            </QueryState>
            {vendorId && (
                <Box sx={{ display: { xs: 'none', md: 'block' }, mt: 2 }}>
                    <EntityRelationships sourceModel="Vendor" sourceId={vendorId} compact />
                </Box>
            )}
            {selectedId && (
                <Box sx={{ mt: 2 }}>
                    <EntityRelationships sourceModel="StoredObject" sourceId={selectedId} compact />
                </Box>
            )}
        </Box>
    );
}
