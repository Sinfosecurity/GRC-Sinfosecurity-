import { useOutletContext } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';
import Surface from '../components/design/Surface';

export default function EngagementHistory() {
    const { engagement } = useOutletContext<{ engagement: any }>();
    const rows = engagement.history || [];
    return (
        <Stack spacing={2}>
            <Surface>
                <Typography variant="h6">History</Typography>
                {!rows.length && <Typography>Not recorded</Typography>}
                {rows.map((row: any, index: number) => (
                    <Typography key={`${row.at}-${index}`} variant="body2">
                        {String(row.at || '').slice(0, 19).replace('T', ' ')} · {row.action} · {row.resourceType}
                    </Typography>
                ))}
            </Surface>
        </Stack>
    );
}
