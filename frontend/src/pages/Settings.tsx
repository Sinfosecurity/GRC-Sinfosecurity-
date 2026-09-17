import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import FormSection from '../components/design/FormSection';
import FactList from '../components/design/FactList';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import { humanizeLabel } from '../utils/humanizeLabel';

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
        <WorkspaceFrame purpose="admin">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Settings' }]}
                title="Settings"
                description="Security for this signed-in session. Notification toggles and MFA enrollment are not mocked here."
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Surface>
                <FormSection title="This session" body="Who is signed in. Role changes happen in Team. A session list is not available in this release.">
                    <FactList
                        columns={1}
                        items={[
                            { label: 'Name', value: user ? `${user.firstName} ${user.lastName}` : '—' },
                            { label: 'Email', value: user?.email || '—' },
                            { label: 'Role', value: humanizeLabel(user?.role) },
                        ]}
                    />
                </FormSection>
                <FormSection title="Password" body="Must meet the server password policy.">
                    <Box component="form" onSubmit={changePassword}>
                        <Stack spacing={2}>
                            <TextField
                                required
                                type="password"
                                label="Current password"
                                autoComplete="current-password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <TextField
                                required
                                type="password"
                                label="New password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                helperText="Must meet the server password policy."
                            />
                            <Button type="submit" variant="contained" disabled={busy || !currentPassword || !newPassword}>
                                {busy ? 'Updating…' : 'Update password'}
                            </Button>
                        </Stack>
                    </Box>
                </FormSection>
                <Typography variant="body2" sx={{ pt: 2 }}>
                    Identity provider, billing, and organization profile have their own Administration pages.
                </Typography>
            </Surface>
        </WorkspaceFrame>
    );
}
