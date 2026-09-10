import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI } from '../services/api';

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

    useEffect(() => {
        tprmAPI.evidence()
            .then((response) => {
                setItems(response.data.data.items || []);
                setStorageStatus(response.data.data.storage?.provider || response.data.data.storage?.status || 'UNKNOWN');
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box sx={{ maxWidth: 1000 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Verified Evidence Vault</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Tenant-scoped stored objects only. Scan status is never assumed CLEAN.
            </Typography>
            <Chip label={`Storage ${storageStatus}`} sx={{ mb: 3 }} />
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
                                        color={item.scanStatus === 'CLEAN' ? 'success' : item.scanStatus === 'NOT_CONFIGURED' ? 'warning' : 'default'}
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
