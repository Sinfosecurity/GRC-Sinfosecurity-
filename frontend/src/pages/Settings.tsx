import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export default function Settings() {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const changePassword = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await authAPI.changePassword(currentPassword, newPassword);
            setMessage('Password updated.');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err: any) {
            setError(err.message || 'Unable to change password');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 640 }}>
            <Typography variant="overline" sx={{ color: '#8b5cf6', fontWeight: 800, letterSpacing: '0.14em' }}>
                Administration
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Security</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Session identity and password change. Notification toggles and MFA enrollment are not mocked here.
            </Typography>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Card sx={{ mb: 3, bgcolor: 'rgba(15,23,42,0.85)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Signed-in account</Typography>
                    <Typography><strong>Name:</strong> {user ? `${user.firstName} ${user.lastName}` : '—'}</Typography>
                    <Typography><strong>Email:</strong> {user?.email || '—'}</Typography>
                    <Typography><strong>Role:</strong> {user?.role || '—'}</Typography>
                </CardContent>
            </Card>
            <Card sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Change password</Typography>
                    <Box component="form" onSubmit={changePassword}>
                        <Stack spacing={2}>
                            <TextField required type="password" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                            <TextField required type="password" label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Must meet the server password policy." />
                            <Button type="submit" variant="contained" disabled={busy || !currentPassword || !newPassword}>
                                Update password
                            </Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
