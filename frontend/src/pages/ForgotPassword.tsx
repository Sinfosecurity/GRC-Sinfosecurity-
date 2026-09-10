import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Container, Link, Stack, TextField, Typography } from '@mui/material';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        try {
            await authAPI.forgotPassword(email);
            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Unable to request a reset');
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 12 }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>Reset password</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {sent ? (
                <Alert severity="success">If an account exists, a reset email will be sent.</Alert>
            ) : (
                <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <Button type="submit" variant="contained">Send reset link</Button>
                    </Stack>
                </Box>
            )}
            <Link component={RouterLink} to="/login" sx={{ display: 'inline-block', mt: 3 }}>Back to sign in</Link>
        </Container>
    );
}
