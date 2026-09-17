import { Box, Typography } from '@mui/material';
import { color, type } from '../../design/tokens';
import Surface from './Surface';

type Item = { label: string; value: string | number; hint?: string };

/** Compact summary strip from live counts. Not a dashboard of decorative KPIs. */
export default function AttentionStrip({ items }: { items: Item[] }) {
    return (
        <Surface>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr 1fr',
                        md: `repeat(${Math.min(Math.max(items.length, 1), 6)}, minmax(0, 1fr))`,
                    },
                    gap: { xs: 1.5, md: 2 },
                }}
            >
                {items.map((item) => (
                    <Box key={item.label} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: type.display, fontSize: { xs: 26, md: 30 }, lineHeight: 1, fontWeight: 500, color: color.ink }}>
                            {item.value}
                        </Typography>
                        <Typography sx={{ mt: 0.6, fontSize: 13, fontWeight: 700 }}>{item.label}</Typography>
                        {item.hint && <Typography variant="caption" sx={{ color: color.inkMuted }}>{item.hint}</Typography>}
                    </Box>
                ))}
            </Box>
        </Surface>
    );
}
