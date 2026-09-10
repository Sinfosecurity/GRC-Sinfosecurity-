import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import QueryState from '../components/QueryState';
import { healthCheck, tprmAPI, vendorAPI } from '../services/api';

type AttentionItem = {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    action: string;
    title: string;
    detail: string;
    vendorName?: string;
    href: string;
};

const severityColor: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f59e0b',
    MEDIUM: '#38bdf8',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [online, setOnline] = useState(false);
    const [items, setItems] = useState<AttentionItem[]>([]);
    const [stats, setStats] = useState<{ totalVendors?: number; highRiskVendors?: number; overdueReviews?: number; activeIssues?: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [health, attention, statistics] = await Promise.allSettled([
                    healthCheck(),
                    tprmAPI.attention(),
                    vendorAPI.getStatistics(),
                ]);
                if (cancelled) return;
                if (health.status === 'fulfilled') {
                    setOnline(health.value?.status === 'ok' || health.value?.status === 'healthy');
                }
                if (attention.status === 'fulfilled') {
                    setItems(attention.value.data.data.items || []);
                } else {
                    setError(attention.reason?.message || 'Unable to load attention queue');
                }
                if (statistics.status === 'fulfilled') {
                    const body = statistics.value.data;
                    setStats(body.summary || body);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Unable to load dashboard');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Box sx={{ maxWidth: 1100 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
                <Box>
                    <Typography variant="overline" sx={{ color: '#fbbf24', letterSpacing: '0.16em', fontWeight: 800 }}>
                        Home
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>
                        What needs attention today
                    </Typography>
                    <Typography color="text.secondary">
                        Live third-party work from this tenant. Empty means nothing is overdue — it does not invent alerts.
                    </Typography>
                </Box>
                <Chip
                    label={online ? 'API connected' : 'API unreachable'}
                    sx={{
                        alignSelf: 'flex-start',
                        bgcolor: online ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: online ? '#34d399' : '#f87171',
                        fontWeight: 700,
                    }}
                />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: 'Vendors', value: stats?.totalVendors ?? '—' },
                    { label: 'High residual', value: stats?.highRiskVendors ?? '—' },
                    { label: 'Overdue reviews', value: stats?.overdueReviews ?? '—' },
                    { label: 'Open issues', value: stats?.activeIssues ?? '—' },
                ].map((card) => (
                    <Card key={card.label} sx={{ flex: 1, bgcolor: 'rgba(15,23,42,0.7)', border: '1px solid rgba(251,191,36,0.18)' }}>
                        <CardContent>
                            <Typography variant="h4" sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700 }}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                        </CardContent>
                    </Card>
                ))}
            </Stack>

            <QueryState loading={loading} error={error} empty={items.length === 0} emptyTitle="Nothing needs attention" emptyBody="When reviews, findings, evidence, or monitoring signals require action, they will appear here.">
                <Stack spacing={1.5}>
                    {items.map((item, index) => (
                        <Card
                            key={item.id}
                            sx={{
                                bgcolor: 'rgba(15,23,42,0.85)',
                                borderLeft: `4px solid ${severityColor[item.severity]}`,
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <CardContent>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'center' }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: severityColor[item.severity], fontWeight: 800 }}>
                                            {index + 1}. {item.severity}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                                        <Typography color="text.secondary">{item.detail}</Typography>
                                    </Box>
                                    <Button variant="contained" onClick={() => navigate(item.href)} sx={{ bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' } }}>
                                        {item.action}
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </QueryState>
        </Box>
    );
}
