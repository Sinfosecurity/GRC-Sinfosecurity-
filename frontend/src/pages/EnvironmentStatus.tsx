import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { systemAPI } from '../services/api';

export default function EnvironmentStatus() {
    const [data, setData] = useState<Record<string, string> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        systemAPI.status()
            .then((response) => setData(response.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box sx={{ maxWidth: 720 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.14em' }}>Administration</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Environment status</Typography>
            <QueryState loading={loading} error={error}>
                <Card sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                    <CardContent>
                        {data && Object.entries(data).map(([key, value]) => (
                            <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                <Typography>{key}</Typography>
                                <Chip size="small" label={String(value)} />
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            </QueryState>
        </Box>
    );
}
