import { Box, Chip, Typography } from '@mui/material';

export function EmptyState({ children }: { children: string }) {
    return (
        <Box sx={{ py: 6, px: 2, border: '1px dashed rgba(196,149,92,0.35)', borderRadius: 1, color: '#c4b09a' }}>
            <Typography>{children}</Typography>
        </Box>
    );
}

export function HealthChip({ value }: { value?: string }) {
    const color =
        value === 'INCIDENT' || value === 'ACTION_REQUIRED'
            ? 'error'
            : value === 'DEGRADED'
                ? 'warning'
                : value === 'HEALTHY'
                    ? 'success'
                    : 'default';
    return <Chip size="small" color={color} label={value || 'UNKNOWN'} />;
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box sx={{ bgcolor: '#1b1410', border: '1px solid rgba(196,149,92,0.18)', borderRadius: 1, p: 2, mb: 2, overflowX: 'auto' }}>
            <Typography sx={{ fontSize: 13, letterSpacing: '0.08em', color: '#c4955c', mb: 1.5 }}>{title}</Typography>
            {children}
        </Box>
    );
}
