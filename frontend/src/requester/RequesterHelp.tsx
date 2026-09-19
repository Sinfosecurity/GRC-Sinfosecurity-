import { Stack, Typography } from '@mui/material';

export default function RequesterHelp() {
    return (
        <Stack spacing={1.5}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32 }}>Help</Typography>
            <Typography>Use this workspace to ask your organization to use a third party or service.</Typography>
            <Typography>The GRC team reviews each request. If they need more information, it appears under Actions required.</Typography>
            <Typography>This workspace does not include the GRC application, vendor questionnaires, or risk scores.</Typography>
        </Stack>
    );
}
