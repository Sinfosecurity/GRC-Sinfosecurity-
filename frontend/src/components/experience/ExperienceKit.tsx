import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';
import { CUSTOMER_STAGES } from '../../experience/customerStages';

export function PageShell({ children }: { children: ReactNode }) {
    return <Box sx={{ maxWidth: 1180, mx: 'auto' }}>{children}</Box>;
}

export function SectionHeader({ title, body }: { title: string; body?: string }) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="h4">{title}</Typography>
            {body && <Typography variant="body2" sx={{ mt: 0.5 }}>{body}</Typography>}
        </Box>
    );
}

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
                py: 1.5,
                pr: 3,
                minWidth: emphasis ? 160 : 110,
                flex: emphasis ? 1.2 : 1,
                border: 0,
                bgcolor: 'transparent',
                color: color.ink,
                cursor: onClick ? 'pointer' : 'default',
                font: 'inherit',
            }}
        >
            <Typography sx={{ fontFamily: type.display, fontSize: emphasis ? 36 : 26, lineHeight: 1, fontWeight: 500 }}>
                {value}
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 14, fontWeight: emphasis ? 700 : 600 }}>{label}</Typography>
            {hint && <Typography variant="body2" sx={{ mt: 0.25 }}>{hint}</Typography>}
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
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                gap: 2,
                alignItems: 'center',
                py: 2,
                mb: 3,
                borderBottom: `1px solid ${color.line}`,
            }}
        >
            <Box>
                <Typography sx={{ fontSize: 13, color: color.inkMuted, fontWeight: 650, mb: 0.5 }}>
                    {count} need your attention
                </Typography>
                <Typography variant="h3">{title}</Typography>
                <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 560 }}>{body}</Typography>
            </Box>
            <Button variant="contained" onClick={onAction}>{actionLabel}</Button>
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
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                gap: 1.5,
                alignItems: 'center',
                py: 1.75,
                borderTop: `1px solid ${color.line}`,
                borderBottom: `1px solid ${color.line}`,
            }}
        >
            <Box>
                <Typography sx={{ fontSize: 13, color: color.inkMuted, fontWeight: 650 }}>Next</Typography>
                <Typography variant="h5" sx={{ mt: 0.25 }}>{label}</Typography>
                {detail && <Typography variant="body2" sx={{ mt: 0.4 }}>{detail}</Typography>}
            </Box>
            {onAction && <Button variant="contained" onClick={onAction}>{label}</Button>}
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
        <Box component="ol" aria-label="Third party stages" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, listStyle: 'none', p: 0, m: 0 }}>
            {CUSTOMER_STAGES.map((step, index) => {
                const state = index < active ? 'completed' : index === active ? (blocked ? 'blocked' : 'current') : 'future';
                return (
                    <Box
                        component="li"
                        key={step}
                        aria-current={state === 'current' ? 'step' : undefined}
                        sx={{
                            pr: 2.5,
                            py: 0.75,
                            color: state === 'future' ? color.inkMuted : color.ink,
                            fontWeight: state === 'current' ? 700 : 500,
                            fontSize: 14,
                            borderBottom: state === 'current' ? `2px solid ${color.navy900}` : '2px solid transparent',
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
    limit = 6,
}: {
    items: Array<{ id: string; title: string; detail: string; vendorName?: string; due?: string; action: string; href: string; severity?: string }>;
    emptyTitle: string;
    emptyBody: string;
    onOpen: (href: string) => void;
    limit?: number;
}) {
    if (!items.length) {
        return (
            <Box sx={{ py: 3 }}>
                <Typography variant="h5">{emptyTitle}</Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>{emptyBody}</Typography>
            </Box>
        );
    }
    const visible = items.slice(0, limit);
    const hidden = items.length - visible.length;
    return (
        <Box>
        <Stack spacing={0} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {visible.map((item) => (
                <Box
                    component="li"
                    key={item.id}
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        gap: 1.25,
                        py: 1.5,
                        borderBottom: `1px solid ${color.line}`,
                    }}
                >
                    <Box>
                        <Typography variant="body2">
                            {[item.vendorName, item.due, item.severity].filter(Boolean).join(' · ')}
                        </Typography>
                        <Typography sx={{ fontWeight: 650 }}>{item.title}</Typography>
                        <Typography variant="body2">{item.detail}</Typography>
                    </Box>
                    <Button variant="contained" onClick={() => onOpen(item.href)} sx={{ alignSelf: { md: 'center' } }}>{item.action}</Button>
                </Box>
            ))}
        </Stack>
            {hidden > 0 && (
                <Typography variant="body2" sx={{ py: 1.5 }}>{hidden} more recorded items stay in Third Parties.</Typography>
            )}
        </Box>
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
        <Box sx={{ pb: 2, borderBottom: `1px solid ${color.line}` }}>
            <Typography variant="body2">{status}</Typography>
            <Typography variant="h2" sx={{ mt: 0.25 }}>{name}</Typography>
            {service && <Typography variant="body2" sx={{ mt: 0.4 }}>{service}</Typography>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.25, sm: 3.5 }} sx={{ mt: 1.75 }}>
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
            <Typography variant="body2">{label}</Typography>
            <Typography sx={{ fontSize: 18, fontFamily: type.display }}>{value ?? '—'}</Typography>
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
                <Typography variant="h5">Risk distribution</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>No third parties are recorded yet, so there is no distribution to show.</Typography>
            </Box>
        );
    }
    return (
        <Box>
            <Typography variant="h5">Risk distribution</Typography>
            <Typography component="p" variant="body2" sx={{ mt: 0.5, mb: 1.25 }}>
                {rows.map((row) => `${row.label} ${row.value}`).join(' · ')}
            </Typography>
            <Box aria-hidden sx={{ display: 'flex', height: 8, bgcolor: color.surfaceMuted }}>
                {rows.filter((row) => row.value).map((row) => (
                    <Box
                        key={row.label}
                        sx={{
                            width: `${(row.value / total) * 100}%`,
                            bgcolor: row.label === 'Critical' ? color.navy950 : row.label === 'High' ? color.navy700 : row.label === 'Medium' ? color.gold : color.lineStrong,
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}
