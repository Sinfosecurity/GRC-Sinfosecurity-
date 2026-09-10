import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Link, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        organizationName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signup(form);
            navigate('/onboarding');
        } catch (err: any) {
            setError(err.message || 'Unable to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 10 }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>Create your Supreme Risk workspace</Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>Start a trial organization. No demo data is invented.</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                    <TextField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                    <TextField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                    <TextField label="Organization name" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required />
                    <TextField label="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    <TextField label="Password" type="password" helperText="At least 10 characters with upper, lower, and a number" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                    <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Creating…' : 'Create organization'}</Button>
                    <Link component={RouterLink} to="/login">Already have an account? Sign in</Link>
                </Stack>
            </Box>
        </Container>
    );
}
