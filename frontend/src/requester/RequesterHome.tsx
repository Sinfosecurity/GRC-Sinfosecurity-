import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';

type RequestRow = {
    id: string;
    publicId: string;
    proposedThirdPartyName: string;
    proposedServiceName: string;
    requesterStatus: string;
    actionRequired?: boolean;
};

export default function RequesterHome() {
    const navigate = useNavigate();
    const [data, setData] = useState<{ recent: RequestRow[]; actions: unknown[]; counts: { requests: number; actionsRequired: number } } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        requesterAPI.home()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.error?.message || 'Unable to load your requests.'));
    }, []);

    return (
        <Stack spacing={3}>
            <div>
                <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: { xs: 32, md: 42 } }}>Your third-party requests</Typography>
                <Typography sx={{ mt: 1, color: color.inkMuted, maxWidth: 640 }}>
                    Ask to use a company or service. The GRC team reviews the request. This is not a risk assessment.
                </Typography>
            </div>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={() => navigate('/request/new')}>New request</Button>
                <Button variant="outlined" onClick={() => navigate('/request/my-requests')}>My requests</Button>
                <Button variant="outlined" onClick={() => navigate('/request/actions')}>
                    Actions required{data ? ` (${data.counts.actionsRequired})` : ''}
                </Button>
            </Stack>
            <section>
                <Typography variant="h2" sx={{ fontSize: 20, mb: 1.5 }}>Recent requests</Typography>
                {!data?.recent.length && <Typography color="text.secondary">You have not submitted a request yet.</Typography>}
                <Stack spacing={1.25}>
                    {data?.recent.map((row) => (
                        <BoxCard key={row.id} to={`/request/${row.publicId}`} title={`${row.publicId} · ${row.proposedThirdPartyName}`} body={`${row.proposedServiceName} · ${row.requesterStatus}${row.actionRequired ? ' · Action required' : ''}`} />
                    ))}
                </Stack>
            </section>
        </Stack>
    );
}

function BoxCard({ to, title, body }: { to: string; title: string; body: string }) {
    return (
        <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Stack sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, px: 2, py: 1.5, minWidth: 0 }}>
                <Typography fontWeight={700}>{title}</Typography>
                <Typography sx={{ color: color.inkMuted }}>{body}</Typography>
            </Stack>
        </Link>
    );
}
