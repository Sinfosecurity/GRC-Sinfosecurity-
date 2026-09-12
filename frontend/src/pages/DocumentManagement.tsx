import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
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

export default function DocumentManagement() {
    const [items, setItems] = useState<Stored[]>([]);
    const [storageStatus, setStorageStatus] = useState('NOT_CONFIGURED');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [vendorId, setVendorId] = useState('');
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
        <Box sx={{ maxWidth: 1000 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Verified Evidence Vault</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Tenant-scoped stored objects only. Scan status is never assumed CLEAN.
            </Typography>
            <Chip label={`Storage ${storageStatus}`} sx={{ mb: 3 }} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <TextField select label="Link upload to vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 280 }}>
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
            <QueryState loading={loading} error={error} empty={items.length === 0} emptyTitle="No evidence uploaded" emptyBody="Uploads appear here with checksum, classification, and malware scan status.">
                <Stack spacing={1.5}>
                    {items.map((item) => (
                        <Card key={item.id} sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between">
                                    <Box>
                                        <Typography fontWeight={700}>{item.filename}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.ownerType}/{item.ownerId} · {item.classification} · {item.size} bytes
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={item.scanStatus}
                                        color={
                                            item.scanStatus === 'CLEAN'
                                                ? 'success'
                                                : item.scanStatus === 'INFECTED'
                                                  ? 'error'
                                                  : item.scanStatus === 'NOT_CONFIGURED' || item.scanStatus === 'PENDING' || item.scanStatus === 'FAILED'
                                                    ? 'warning'
                                                    : 'default'
                                        }
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </QueryState>
        </Box>
    );
}
