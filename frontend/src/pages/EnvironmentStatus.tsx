import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
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
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Environment' }]}
                title="Environment status"
                description="Provider and environment facts from the server. This page does not invent connected status."
            />
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
