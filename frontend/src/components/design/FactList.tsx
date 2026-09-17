import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';

type Fact = { label: string; value: ReactNode };

export default function FactList({ items, columns = 2 }: { items: Fact[]; columns?: 1 | 2 | 3 }) {
    return (
        <Box
            component="dl"
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: columns === 1 ? '1fr' : '1fr 1fr',
                    md: `repeat(${columns}, minmax(0, 1fr))`,
                },
                gap: { xs: 1.25, md: 2 },
                m: 0,
            }}
        >
            {items.map((item) => (
                <Box key={item.label} sx={{ minWidth: 0, py: 1, borderBottom: `1px solid ${color.line}` }}>
                    <Typography
                        component="dt"
                        variant="caption"
                        sx={{ color: color.inkMuted, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}
                    >
                        {item.label}
                    </Typography>
                    <Typography
                        component="dd"
                        sx={{ m: 0, mt: 0.45, fontFamily: type.display, fontSize: 18, fontWeight: 500, color: color.ink, wordBreak: 'break-word' }}
                    >
                        {item.value}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
