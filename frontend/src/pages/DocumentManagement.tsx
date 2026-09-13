import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import { tprmAPI, vendorAPI } from '../services/api';

type Stored = {
    id: string;
    filename: string;
    ownerType: string;
    ownerId: string;
    scanStatus: string;
    classification: string;
    uploadedAt: string;
    size: number;
};

function scanTone(status: string): 'success' | 'critical' | 'high' | 'neutral' {
    if (status === 'CLEAN') return 'success';
    if (status === 'INFECTED') return 'critical';
    if (status === 'PENDING' || status === 'FAILED' || status === 'NOT_CONFIGURED') return 'high';
    return 'neutral';
}

export default function DocumentManagement() {
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState<Stored[]>([]);
    const [storageStatus, setStorageStatus] = useState('NOT_CONFIGURED');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [uploading, setUploading] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([tprmAPI.evidence(), vendorAPI.getAll()])
            .then(([response, vendorRes]) => {
                setItems(response.data.data.items || []);
                setStorageStatus(response.data.data.storage?.provider || response.data.data.storage?.status || 'UNKNOWN');
                const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
                setVendors(Array.isArray(vendorRows) ? vendorRows : []);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <PageHeader
                crumbs={[{ label: 'Third-party risk' }, { label: 'Evidence' }]}
                title="Evidence"
                description="Documents linked to vendors and assessments. Scan status is never assumed clean. Download stays blocked until a file is cleared."
                meta={<StatusBadge kind="plain" tone={storageStatus === 'NOT_CONFIGURED' ? 'high' : 'info'} label={storageStatus === 'NOT_CONFIGURED' ? 'Storage not ready' : 'Storage ready'} />}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField select label="Link upload to vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 280 }}>
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
            {!vendorId && <Alert severity="info" sx={{ mb: 2 }}>Select a vendor so the file is stored and linked atomically. Unlinked uploads are disabled.</Alert>}
            <QueryState
                loading={loading}
                error={error}
                empty={items.length === 0}
                emptyTitle="No evidence uploaded"
                emptyBody="Uploads appear here with classification and malware scan status. Choose a vendor, then attach a file."
            >
                <AppTable
                    rows={items}
                    rowKey={(row) => row.id}
                    searchPlaceholder="Search evidence"
                    searchValue={(row) => `${row.filename} ${row.classification} ${row.scanStatus}`}
                    columns={[
                        { id: 'file', label: 'File', sortValue: (row) => row.filename, render: (row) => (
                            <Box>
                                <Typography variant="subtitle2">{row.filename}</Typography>
                                <Typography variant="caption">{row.ownerType} · {row.classification}</Typography>
                            </Box>
                        ) },
                        { id: 'scan', label: 'Scan', sortValue: (row) => row.scanStatus, render: (row) => (
                            <StatusBadge kind="plain" tone={scanTone(row.scanStatus)} label={row.scanStatus} />
                        ) },
                        { id: 'size', label: 'Size', hideOnMobile: true, sortValue: (row) => row.size, render: (row) => `${row.size} bytes` },
                        { id: 'when', label: 'Uploaded', hideOnMobile: true, sortValue: (row) => row.uploadedAt, render: (row) => row.uploadedAt?.slice(0, 10) || '—' },
                    ]}
                />
            </QueryState>
        </Box>
    );
}
