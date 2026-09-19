import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Stack, Typography } from '@mui/material';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';

export default function RequesterMyRequests() {
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        requesterAPI.list()
            .then((res) => setRows(res.data.data.items || []))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load requests.'));
    }, []);

    return (
        <Stack spacing={2}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32 }}>My requests</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            {!rows.length && !error && <Typography color="text.secondary">No requests yet.</Typography>}
            {rows.map((row) => (
                <Link key={row.id} to={`/request/${row.publicId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Stack sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: 2 }}>
                        <Typography fontWeight={700}>{row.publicId} · {row.proposedThirdPartyName}</Typography>
                        <Typography>{row.proposedServiceName}</Typography>
                        <Typography sx={{ color: color.inkMuted }}>
                            {row.requesterStatus}
                            {row.actionRequired ? ' · Action required' : ''}
                            {row.submittedAt ? ` · Submitted ${new Date(row.submittedAt).toLocaleDateString()}` : ''}
                        </Typography>
                    </Stack>
                </Link>
            ))}
        </Stack>
    );
}
