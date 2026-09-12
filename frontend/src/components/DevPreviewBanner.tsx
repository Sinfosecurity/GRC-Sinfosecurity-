import { Box, Typography } from '@mui/material';

type EnvironmentFlags = {
    VITE_ENVIRONMENT?: string;
    DEV?: boolean;
    PROD?: boolean;
    VITE_PREVIEW_LABEL?: string;
};

export function environmentLabelFrom(env: EnvironmentFlags): 'STAGING' | 'DEVELOPMENT' | null {
    if (env.VITE_ENVIRONMENT === 'staging') return 'STAGING';
    if (env.VITE_ENVIRONMENT === 'production' || env.PROD) return null;
    if (env.DEV || env.VITE_PREVIEW_LABEL === 'true') return 'DEVELOPMENT';
    return null;
}

export function environmentLabel(): 'STAGING' | 'DEVELOPMENT' | null {
    return environmentLabelFrom({
        VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD,
        VITE_PREVIEW_LABEL: import.meta.env.VITE_PREVIEW_LABEL,
    });
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
                bgcolor: '#3a2a14',
                color: '#f4efe6',
                textAlign: 'center',
                py: 0.45,
                px: 2,
                letterSpacing: '0.08em',
                borderBottom: '1px solid rgba(198,164,107,0.35)',
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
