import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, Panel } from '../ui';

export default function PlatformOverview() {
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [attention, setAttention] = useState<Array<Record<string, string>>>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([platformAPI.overview(), platformAPI.attention()])
            .then(([overview, queue]) => {
                setData(overview.data.data);
                setAttention(queue.data.data);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const orgs = (data?.organizations || {}) as Record<string, number>;
    const cards: Array<[string, number]> = [
        ['Organizations', Number(orgs.total || 0)],
        ['Active', Number(orgs.active || 0)],
        ['Trial', Number(orgs.trial || 0)],
        ['Paid', Number(orgs.paid || 0)],
        ['Past due', Number(orgs.pastDue || 0)],
        ['Disabled', Number(orgs.disabled || 0)],
        ['Active users', Number(data?.activeUsers || 0)],
        ['Open tickets', Number(data?.openSupportTickets || 0)],
        ['P1', Number(data?.p1Tickets || 0)],
        ['P2', Number(data?.p2Tickets || 0)],
        ['Incidents', Number(data?.openIncidents || 0)],
        ['Failed notifications', Number(data?.failedNotifications || 0)],
    ];

    return (
        <QueryState loading={loading} error={error}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5, mb: 3 }}>
                {cards.map(([label, value]) => (
                    <Box key={String(label)} sx={{ p: 2, bgcolor: '#1b1410', border: '1px solid rgba(196,149,92,0.18)' }}>
                        <Typography sx={{ fontSize: 12, color: '#c4955c' }}>{label}</Typography>
                        <Typography sx={{ fontFamily: 'Newsreader, serif', fontSize: 28 }}>{value ?? 0}</Typography>
                    </Box>
                ))}
            </Box>
            <Panel title="Needs attention">
                {attention.length === 0 ? (
                    <EmptyState>No items currently require platform attention.</EmptyState>
                ) : (
                    attention.map((item) => (
                        <Box key={`${item.kind}-${item.id}`} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, gap: 2 }}>
                            <Typography>{item.severity} · {item.title}</Typography>
                            <Typography sx={{ color: '#c4b09a' }}>{item.organizationName || '—'}</Typography>
                        </Box>
                    ))
                )}
            </Panel>
        </QueryState>
    );
}
