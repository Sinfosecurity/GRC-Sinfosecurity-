import { Box, Stack, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';
import StatusBadge from './StatusBadge';
import { humanizeLabel } from '../../utils/humanizeLabel';

export function riskDelta(inherent: number, residual: number) {
    return residual - inherent;
}

function evidenceNote(value?: string) {
    const key = (value || '').toUpperCase();
    if (key === 'NOT_CONFIGURED') return 'No stored evidence objects were recorded on this brief.';
    if (key === 'FAILED') return 'Stored evidence includes a failed or infected scan.';
    if (key === 'DEGRADED') return 'Stored evidence includes a pending or unconfigured scan.';
    return 'This is the stored evidence-confidence value for the brief.';
}

export function DecisionRiskStrip({
    inherent,
    residual,
    band,
    findings,
    alerts,
}: {
    inherent: number;
    residual: number;
    band?: string;
    findings: number;
    alerts: number;
}) {
    const delta = riskDelta(inherent, residual);
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)' },
                border: `1px solid ${color.line}`,
                borderRadius: '10px',
                overflow: 'hidden',
                bgcolor: color.surface,
            }}
        >
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: color.surfaceMuted, borderRight: { md: `1px solid ${color.line}` }, borderBottom: { xs: `1px solid ${color.line}`, md: 0 } }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkMuted }}>
                    Risk movement
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                    <Typography component="span" sx={{ fontFamily: type.mono, fontSize: 18, color: color.inkMuted }}>
                        Inherent {inherent}
                    </Typography>
                    <Typography component="span" aria-hidden sx={{ color: color.inkFaint }}>→</Typography>
                    <Typography component="span" sx={{ fontFamily: type.display, fontSize: 36, lineHeight: 1, fontWeight: 500 }}>
                        {residual}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: 14, fontWeight: 700 }}>Residual</Typography>
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                    {delta === 0
                        ? 'Residual equals inherent. No change is recorded on this brief.'
                        : `Change ${delta > 0 ? '+' : ''}${delta}. Residual is the decision-relevant measure.`}
                    {band ? ` Risk band ${humanizeLabel(band)}.` : ''}
                </Typography>
            </Box>
            <StripFact label="Open findings" value={findings} hint="Live tenant count" />
            <StripFact label="Monitoring alerts" value={alerts} hint="Live tenant count" last />
        </Box>
    );
}

function StripFact({ label, value, hint, last }: { label: string; value: number; hint: string; last?: boolean }) {
    return (
        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, borderRight: { md: last ? 0 : `1px solid ${color.line}` }, borderBottom: { xs: last ? 0 : `1px solid ${color.line}`, md: 0 } }}>
            <Typography sx={{ fontFamily: type.display, fontSize: 32, lineHeight: 1, fontWeight: 500 }}>{value}</Typography>
            <Typography sx={{ mt: 0.75, fontSize: 13, fontWeight: 700 }}>{label}</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>{hint}</Typography>
        </Box>
    );
}

export function EvidenceHealth({
    confidence,
    findings,
    alerts,
}: {
    confidence: string;
    findings: number;
    alerts: number;
}) {
    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkMuted }}>
                    Evidence confidence
                </Typography>
                <StatusBadge kind="plain" label={humanizeLabel(confidence)} />
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>{evidenceNote(confidence)}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: color.inkMuted }}>
                {findings} open findings · {alerts} monitoring alerts. Those counts are live tenant data, not a model estimate.
            </Typography>
        </Box>
    );
}
