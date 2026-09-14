import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { vendorPortalAPI } from '../services/api';

export default function VendorAssessmentActivate() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [token, setToken] = useState(params.get('token') || '');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const activate = async (value: string) => {
        setSaving(true);
        setError(null);
        try {
            const response = await vendorPortalAPI.activate(value);
            localStorage.setItem('vendorToken', response.data.data.token);
            navigate('/vendor-assessment');
        } catch (err: any) {
            setError(err.message || 'This invitation is not valid.');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (params.get('token')) activate(params.get('token') || '');
    }, []);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        activate(token);
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0b1f33', color: 'white', px: 2, py: 8 }}>
            <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto' }}>
                <Typography variant="overline" sx={{ color: '#e7e0d4' }}>Supreme Third Party</Typography>
                <Typography variant="h4">Open your assessment</Typography>
                <Typography>Use the secure invitation from the requesting organization. You will only see the assessments assigned to you.</Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <Stack component="form" spacing={2} onSubmit={submit}>
                    <TextField
                        label="Invitation code"
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                        fullWidth
                        required
                        sx={{ bgcolor: 'white', borderRadius: 1 }}
                    />
                    <Button type="submit" variant="contained" disabled={saving || !token}>Continue</Button>
                </Stack>
            </Stack>
        </Box>
    );
}
