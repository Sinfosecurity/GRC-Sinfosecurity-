import { Alert, Box, Typography } from '@mui/material';

export default function LegacyQuarantine() {
    return (
        <Box sx={{ maxWidth: 720, py: 6 }}>
            <Typography variant="overline" sx={{ color: '#f59e0b', fontWeight: 800, letterSpacing: '0.14em' }}>
                Quarantined
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                This legacy GRC page is not in the production path
            </Typography>
            <Alert severity="warning">
                Supreme Third Party does not expose unfinished mock GRC modules to paying users.
                Set <code>VITE_ENABLE_LEGACY_GRC=true</code> only for internal review. Do not enable this flag in staging or production.
            </Alert>
        </Box>
    );
}
