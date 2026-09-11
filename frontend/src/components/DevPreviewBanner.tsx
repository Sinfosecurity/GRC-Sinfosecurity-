import { Box, Typography } from '@mui/material';

type EnvironmentFlags = {
    VITE_ENVIRONMENT?: string;
    DEV?: boolean;
    VITE_PREVIEW_LABEL?: string;
};

export function environmentLabelFrom(env: EnvironmentFlags): 'STAGING' | 'DEVELOPMENT' | null {
    if (env.VITE_ENVIRONMENT === 'staging') return 'STAGING';
    if (env.DEV || env.VITE_PREVIEW_LABEL === 'true') return 'DEVELOPMENT';
    return null;
}

export function environmentLabel(): 'STAGING' | 'DEVELOPMENT' | null {
    return environmentLabelFrom(import.meta.env);
}

export function shouldShowDevPreviewBanner(): boolean {
    return environmentLabel() !== null;
}

export default function DevPreviewBanner() {
    if (!shouldShowDevPreviewBanner()) {
        return null;
    }

    return (
        <Box
            role="status"
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 2000,
                bgcolor: '#b45309',
                color: '#fff',
                textAlign: 'center',
                py: 0.75,
                px: 2,
                letterSpacing: '0.04em',
            }}
        >
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                {environmentLabel() === 'STAGING' ? 'SUPREME RISK — STAGING' : 'SUPREME RISK — DEVELOPMENT PREVIEW'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9, fontSize: '0.7rem' }}>
                {environmentLabel() === 'STAGING'
                    ? 'Isolated staging environment. Not production. Do not use production tenant data.'
                    : 'Local demo data only. Not production. Authentication and tenant isolation remain enabled.'}
            </Typography>
        </Box>
    );
}
