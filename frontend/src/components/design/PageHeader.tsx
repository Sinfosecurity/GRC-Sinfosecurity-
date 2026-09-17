import type { ReactNode } from 'react';
import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { color, type } from '../../design/tokens';

type Crumb = { label: string; to?: string };

type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    crumbs?: Crumb[];
    actions?: ReactNode;
    meta?: ReactNode;
};

export default function PageHeader({ eyebrow, title, description, crumbs, actions, meta }: Props) {
    return (
        <Box component="header" sx={{ mb: 2.5 }}>
            {crumbs && crumbs.length > 0 && (
                <Breadcrumbs
                    aria-label="Breadcrumb"
                    sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { color: 'text.secondary' } }}
                >
                    {crumbs.map((crumb) =>
                        crumb.to ? (
                            <Link key={crumb.label} component={RouterLink} to={crumb.to} underline="hover" color="text.secondary" variant="caption">
                                {crumb.label}
                            </Link>
                        ) : (
                            <Typography key={crumb.label} variant="caption" color="text.primary">{crumb.label}</Typography>
                        )
                    )}
                </Breadcrumbs>
            )}
            <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ lg: 'flex-start' }}>
                <Box sx={{ minWidth: 0, maxWidth: 760 }}>
                    {eyebrow && <Typography variant="overline" sx={{ color: color.goldInk }}>{eyebrow}</Typography>}
                    <Typography variant="h2" component="h1" sx={{ fontFamily: type.display, fontSize: { xs: '1.85rem', md: '2.15rem' }, letterSpacing: '-0.03em' }}>{title}</Typography>
                    {description && (
                        <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 640 }}>
                            {description}
                        </Typography>
                    )}
                    {meta && <Box sx={{ mt: 1.25 }}>{meta}</Box>}
                </Box>
                {actions && (
                    <Box sx={{ minWidth: 0, maxWidth: '100%', flex: { lg: '0 1 520px' } }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
                            {actions}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Box>
    );
}
