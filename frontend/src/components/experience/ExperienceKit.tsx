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
    phase = 'ready',
}: {
    label: string;
    value: string | number;
    hint?: string;
    emphasis?: boolean;
    onClick?: () => void;
    phase?: 'loading' | 'error' | 'ready';
}) {
    const spoken = phase === 'loading' ? `${label}: checking` : phase === 'error' ? `${label}: unavailable` : `${label}: ${value}`;
    return (
        <Box
            component={onClick && phase === 'ready' ? 'button' : 'div'}
            type={onClick && phase === 'ready' ? 'button' : undefined}
            aria-label={spoken}
            aria-busy={phase === 'loading' || undefined}
            onClick={phase === 'ready' ? onClick : undefined}
            sx={{
                textAlign: 'left',
                py: 1.5,
                pr: 3,
                minWidth: emphasis ? 160 : 110,
                flex: emphasis ? 1.2 : 1,
                border: 0,
                bgcolor: 'transparent',
                color: color.ink,
                cursor: onClick && phase === 'ready' ? 'pointer' : 'default',
                font: 'inherit',
            }}
        >
            {phase === 'loading' ? (
                <Box aria-hidden sx={{ width: emphasis ? 72 : 48, height: emphasis ? 36 : 26, bgcolor: color.surfaceMuted, borderRadius: 0.5 }} />
            ) : (
                <Typography sx={{ fontFamily: type.display, fontSize: emphasis ? 36 : 26, lineHeight: 1, fontWeight: 500 }}>
                    {phase === 'error' ? 'Unavailable' : value}
                </Typography>
            )}
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
    phase = 'ready',
}: {
    count: number;
    title: string;
    body: string;
    actionLabel: string;
    onAction: () => void;
    phase?: 'loading' | 'error' | 'ready';
}) {
    return (
        <Box
            role={phase === 'loading' ? 'status' : undefined}
            aria-busy={phase === 'loading' || undefined}
            aria-live={phase === 'loading' ? 'polite' : undefined}
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto' },
                gap: { xs: 2, md: 4 },
                alignItems: 'center',
                px: { xs: 2.5, md: 4 },
                py: { xs: 3, md: 4 },
                mb: 4,
                bgcolor: color.navy950,
                color: color.navInk,
                boxShadow: `inset 0 0 0 1px ${color.gold}`,
            }}
        >
            {phase === 'loading' ? (
                <Box aria-hidden sx={{ width: { xs: 72, md: 96 }, height: { xs: 56, md: 72 }, bgcolor: 'rgba(243,236,222,0.12)' }} />
            ) : (
                <Typography
                    aria-hidden={phase !== 'ready'}
                    sx={{ fontFamily: type.display, fontSize: { xs: 56, md: 80 }, lineHeight: 0.9, fontWeight: 500, color: color.goldSoft, minWidth: { md: 96 } }}
                >
                    {phase === 'error' ? '—' : count}
                </Typography>
            )}
            <Box>
                <Typography sx={{ fontSize: 12, color: color.goldSoft, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', mb: 0.75 }}>
                    {phase === 'loading' ? 'Checking what needs your attention…' : phase === 'error' ? 'Attention could not be loaded' : `${count} need your attention`}
                </Typography>
                {phase === 'loading' ? (
                    <>
                        <Box aria-hidden sx={{ width: { xs: '80%', md: 360 }, height: 28, bgcolor: 'rgba(243,236,222,0.12)', mb: 1 }} />
                        <Box aria-hidden sx={{ width: { xs: '60%', md: 240 }, height: 16, bgcolor: 'rgba(243,236,222,0.08)' }} />
                    </>
                ) : (
                    <>
                        <Typography sx={{ fontFamily: type.display, fontSize: { xs: 26, md: 34 }, lineHeight: 1.15, fontWeight: 500, color: color.navInk }}>
                            {phase === 'error' ? 'The attention queue is unavailable' : title}
                        </Typography>
                        <Typography sx={{ mt: 1, maxWidth: 560, color: color.navMuted, fontSize: 15, lineHeight: 1.5 }}>{body}</Typography>
                    </>
                )}
            </Box>
            {phase === 'ready' && (
                <Button variant="contained" color="secondary" onClick={onAction} sx={{ justifySelf: { md: 'end' } }}>
                    {actionLabel}
                </Button>
            )}
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
        <Box component="ol" aria-label="Third party stages" sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, md: 3 }, listStyle: 'none', p: 0, m: 0, py: 1 }}>
            {CUSTOMER_STAGES.map((step, index) => {
                const state = index < active ? 'completed' : index === active ? (blocked ? 'blocked' : 'current') : 'future';
                return (
                    <Box
                        component="li"
                        key={step}
                        aria-current={state === 'current' ? 'step' : undefined}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: state === 'future' ? color.inkFaint : color.ink,
                            fontWeight: state === 'current' ? 700 : 500,
                            fontSize: 13,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        <Box
                            aria-hidden
                            sx={{
                                width: 8,
                                height: 8,
                                bgcolor: state === 'current' ? color.gold : state === 'completed' ? color.ink : 'transparent',
                                border: `1px solid ${state === 'future' ? color.lineStrong : color.ink}`,
                                transform: state === 'blocked' ? 'rotate(45deg)' : 'none',
                            }}
                        />
                        {step}{state === 'blocked' ? ' · blocked' : state === 'current' ? ' · now' : ''}
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
                            bgcolor: row.label === 'Critical' ? color.critical : row.label === 'High' ? color.high : row.label === 'Medium' ? color.medium : color.low,
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}
