import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import { integrationAPI } from '../services/api';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';

const PROVIDERS = ['slack', 'jira', 'servicenow', 'siem'];

export default function Integrations() {
    const [status, setStatus] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        integrationAPI.status()
            .then((res) => setStatus(res.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Integrations' }]}
                title="Integrations"
                description="Status is reported by the server. Not configured means the integration can be connected later — not that it is working."
            />
            <QueryState loading={loading} error={error}>
                <Grid container spacing={2}>
                    {PROVIDERS.map((provider) => (
                        <Grid item xs={12} md={6} key={provider}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>{provider}</Typography>
                                    <Chip
                                        sx={{ mt: 1, mb: 2 }}
                                        label={status[provider] || 'NOT_CONFIGURED'}
                                        color={status[provider] === 'CONNECTED' ? 'success' : 'default'}
                                    />
                                    <Button
                                        size="small"
                                        onClick={async () => {
                                            const result = await integrationAPI.test(provider);
                                            setStatus((prev) => ({ ...prev, [provider]: result.data.data.status }));
                                        }}
                                    >
                                        Test connection
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </QueryState>
        </Box>
    );
}
