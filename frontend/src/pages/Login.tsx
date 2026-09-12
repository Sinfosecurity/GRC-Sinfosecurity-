import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Link, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { environmentLabel } from '../components/DevPreviewBanner';
import MarketingLayout from '../marketing/MarketingLayout';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Unable to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MarketingLayout>
        <Container maxWidth="sm" sx={{ py: 12 }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>Supreme Risk</Typography>
            {environmentLabel() && (
                <Typography color="warning.main" sx={{ mb: 1, fontWeight: 700 }}>
                    {environmentLabel() === 'STAGING' ? 'SUPREME RISK — STAGING' : 'SUPREME RISK — DEVELOPMENT PREVIEW'}
                </Typography>
            )}
            <Typography color="text.secondary" sx={{ mb: 4 }}>
                {environmentLabel() === 'STAGING'
                    ? 'Sign in to the isolated staging organization'
                    : environmentLabel() === 'DEVELOPMENT'
                        ? 'Sign in to the local demo organization'
                        : 'Sign in to your organization'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                    <TextField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
                    <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
                    <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
                    <Stack direction="row" justifyContent="space-between">
                        <Link component={RouterLink} to="/forgot-password">Forgot password</Link>
                        <Link component={RouterLink} to="/register">Create organization</Link>
                    </Stack>
                </Stack>
            </Box>
        </Container>
        </MarketingLayout>
    );
}
