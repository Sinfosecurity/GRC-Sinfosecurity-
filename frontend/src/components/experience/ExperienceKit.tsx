import { Box, Button, Stack, Typography } from '@mui/material';
import { color } from '../../design/tokens';
import { CUSTOMER_STAGES } from '../../experience/customerStages';

export function ExecutiveMetric({
    label,
    value,
    hint,
    emphasis = false,
    onClick,
}: {
    label: string;
    value: string | number;
    hint?: string;
    emphasis?: boolean;
    onClick?: () => void;
}) {
    return (
        <Box
            component={onClick ? 'button' : 'div'}
            type={onClick ? 'button' : undefined}
            aria-label={`${label}: ${value}`}
            onClick={onClick}
            sx={{
                textAlign: 'left',
                p: emphasis ? 2.5 : 2,
                minWidth: emphasis ? 180 : 120,
                flex: emphasis ? 1.4 : 1,
                border: 0,
                bgcolor: emphasis ? color.navy950 : 'transparent',
                color: emphasis ? color.navInk : color.ink,
                cursor: onClick ? 'pointer' : 'default',
                font: 'inherit',
            }}
        >
            <Typography sx={{ fontFamily: '"Newsreader", serif', fontSize: emphasis ? 40 : 28, lineHeight: 1, fontWeight: 500 }}>
                {value}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 15, fontWeight: 650 }}>{label}</Typography>
            {hint && <Typography sx={{ mt: 0.5, fontSize: 13, color: emphasis ? color.navMuted : color.inkMuted }}>{hint}</Typography>}
        </Box>
    );
}

export function AttentionHero({
    count,
    title,
    body,
    actionLabel,
    onAction,
}: {
    count: number;
    title: string;
    body: string;
    actionLabel: string;
    onAction: () => void;
}) {
    return (
        <Box sx={{ bgcolor: color.navy950, color: color.navInk, p: { xs: 2.5, md: 4 }, mb: 3 }}>
            <Typography sx={{ fontSize: 13, color: color.goldSoft, fontWeight: 700, mb: 1 }}>{count} need your attention</Typography>
            <Typography variant="h3" sx={{ fontFamily: '"Newsreader", serif', fontWeight: 500, mb: 1 }}>{title}</Typography>
            <Typography sx={{ maxWidth: 640, color: color.navMuted, mb: 2 }}>{body}</Typography>
            <Button variant="contained" onClick={onAction} sx={{ bgcolor: color.gold, color: color.navy950, '&:hover': { bgcolor: color.goldSoft } }}>
                {actionLabel}
            </Button>
        </Box>
    );
}

export function NextActionCard({
    label,
    detail,
    onAction,
}: {
    label: string;
    detail?: string;
    onAction?: () => void;
}) {
    return (
        <Box sx={{ bgcolor: color.navy900, color: color.navInk, p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontSize: 13, color: color.goldSoft, fontWeight: 700, mb: 0.5 }}>Next</Typography>
            <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif', fontWeight: 500 }}>{label}</Typography>
            {detail && <Typography sx={{ mt: 0.75, color: color.navMuted }}>{detail}</Typography>}
            {onAction && (
                <Button variant="contained" onClick={onAction} sx={{ mt: 2, bgcolor: color.gold, color: color.navy950, '&:hover': { bgcolor: color.goldSoft } }}>
                    {label}
                </Button>
            )}
        </Box>
    );
}

export function LifecycleProgress({
    active,
    blocked = false,
}: {
    active: number;
    blocked?: boolean;
}) {
    return (
        <Box component="ol" aria-label="Third party stages" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, listStyle: 'none', p: 0, m: 0 }}>
            {CUSTOMER_STAGES.map((step, index) => {
                const state = index < active ? 'completed' : index === active ? (blocked ? 'blocked' : 'current') : 'future';
                return (
                    <Box
                        component="li"
                        key={step}
                        aria-current={state === 'current' ? 'step' : undefined}
                        sx={{
                            px: 1.5,
                            py: 0.75,
                            bgcolor: state === 'current' ? color.navy950 : state === 'completed' ? color.surfaceMuted : 'transparent',
                            color: state === 'current' ? color.navInk : color.ink,
                            fontWeight: state === 'current' ? 700 : 500,
                            fontSize: 14,
                        }}
                    >
                        {index + 1}. {step}{state === 'blocked' ? ' · blocked' : ''}
                    </Box>
                );
            })}
        </Box>
    );
}

export function ActionQueue({
    items,
    emptyTitle,
    emptyBody,
    onOpen,
}: {
    items: Array<{ id: string; title: string; detail: string; vendorName?: string; due?: string; action: string; href: string; severity?: string }>;
    emptyTitle: string;
    emptyBody: string;
    onOpen: (href: string) => void;
}) {
    if (!items.length) {
        return (
            <Box sx={{ py: 4 }}>
                <Typography variant="h5">{emptyTitle}</Typography>
                <Typography sx={{ color: color.inkMuted, mt: 1 }}>{emptyBody}</Typography>
            </Box>
        );
    }
    return (
        <Stack spacing={0} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {items.map((item) => (
                <Box
                    component="li"
                    key={item.id}
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                        py: 2,
                        borderBottom: `1px solid ${color.line}`,
                    }}
                >
                    <Box>
                        <Typography sx={{ fontSize: 13, color: color.inkMuted }}>
                            {[item.vendorName, item.due, item.severity].filter(Boolean).join(' · ')}
                        </Typography>
                        <Typography variant="h6" sx={{ fontFamily: '"Newsreader", serif', fontWeight: 500 }}>{item.title}</Typography>
                        <Typography sx={{ color: color.inkMuted }}>{item.detail}</Typography>
                    </Box>
                    <Button variant="contained" onClick={() => onOpen(item.href)} sx={{ alignSelf: { md: 'center' } }}>{item.action}</Button>
                </Box>
            ))}
        </Stack>
    );
}

export function EntitySummary({
    name,
    service,
    owner,
    tier,
    inherent,
    residual,
    status,
}: {
    name: string;
    service?: string;
    owner?: string;
    tier?: string;
    inherent?: string | number;
    residual?: string | number;
    status?: string;
}) {
    return (
        <Box sx={{ bgcolor: color.navy950, color: color.navInk, p: { xs: 2.5, md: 3.5 } }}>
            <Typography sx={{ fontSize: 13, color: color.goldSoft, fontWeight: 700 }}>{status}</Typography>
            <Typography variant="h3" sx={{ fontFamily: '"Newsreader", serif', fontWeight: 500, mt: 0.5 }}>{name}</Typography>
            {service && <Typography sx={{ color: color.navMuted, mt: 0.5 }}>{service}</Typography>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 2.5 }}>
                <Fact label="Tier" value={tier} />
                <Fact label="Inherent risk" value={inherent} />
                <Fact label="Residual risk" value={residual} />
                <Fact label="Owner" value={owner} />
            </Stack>
        </Box>
    );
}

function Fact({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <Box>
            <Typography sx={{ fontSize: 13, color: color.navMuted }}>{label}</Typography>
            <Typography sx={{ fontSize: 20, fontFamily: '"Newsreader", serif' }}>{value ?? '—'}</Typography>
        </Box>
    );
}

export function RiskDistribution({
    counts,
}: {
    counts: { critical?: number; high?: number; medium?: number; low?: number };
}) {
    const rows = [
        { label: 'Critical', value: Number(counts.critical || 0) },
        { label: 'High', value: Number(counts.high || 0) },
        { label: 'Medium', value: Number(counts.medium || 0) },
        { label: 'Low', value: Number(counts.low || 0) },
    ];
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    if (!total) {
        return (
            <Box>
                <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif' }}>Risk distribution</Typography>
                <Typography sx={{ color: color.inkMuted, mt: 0.5 }}>No third parties are recorded yet, so there is no distribution to show.</Typography>
            </Box>
        );
    }
    return (
        <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif' }}>Risk distribution</Typography>
            <Typography component="p" sx={{ color: color.inkMuted, mt: 0.5, mb: 1.5 }}>
                {rows.map((row) => `${row.label} ${row.value}`).join(' · ')}
            </Typography>
            <Box aria-hidden sx={{ display: 'flex', height: 12, bgcolor: color.surfaceMuted }}>
                {rows.filter((row) => row.value).map((row) => (
                    <Box
                        key={row.label}
                        sx={{
                            width: `${(row.value / total) * 100}%`,
                            bgcolor: row.label === 'Critical' ? color.navy950 : row.label === 'High' ? color.navy700 : row.label === 'Medium' ? color.gold : color.line,
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}
