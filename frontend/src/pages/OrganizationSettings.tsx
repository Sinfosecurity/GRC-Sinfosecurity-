import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Grid, MenuItem, TextField } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import Surface from '../components/design/Surface';
import FormSection from '../components/design/FormSection';
import { organizationAPI } from '../services/api';

const emptyForm = {
    name: '',
    legalName: '',
    industry: '',
    country: '',
    timezone: 'UTC',
    size: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
};

export default function OrganizationSettings() {
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        setError(null);
        organizationAPI.getCurrent()
            .then((response) => {
                const org = response.data.data || response.data;
                setForm({
                    name: org.name || '',
                    legalName: org.legalName || '',
                    industry: org.industry || '',
                    country: org.country || '',
                    timezone: org.timezone || 'UTC',
                    size: org.size || '',
                    contactName: org.contactName || '',
                    contactEmail: org.contactEmail || '',
                    contactPhone: org.contactPhone || '',
                });
            })
            .catch((err) => setError(err.message || 'Unable to load organization'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            await organizationAPI.update(form);
            setMessage('Organization profile saved.');
            load();
        } catch (err: any) {
            setError(err.message || 'Unable to save organization');
        } finally {
            setSaving(false);
        }
    };

    return (
        <WorkspaceFrame purpose="admin">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Organization' }]}
                title="Organization"
                description="Tenant-scoped organization record. Logo upload is not supported in this release."
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <QueryState loading={loading} error={error}>
                <Surface>
                    <Box component="form" onSubmit={save}>
                        <FormSection title="Organization" body="Legal and operating identity for this tenant.">
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth required label="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth label="Legal name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth required label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField select fullWidth label="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                                        {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin'].map((zone) => (
                                            <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth label="Organization size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
                                </Grid>
                            </Grid>
                        </FormSection>
                        <FormSection title="Primary contact" body="Used for tenant administration, not marketing.">
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <TextField fullWidth label="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField fullWidth type="email" label="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField fullWidth label="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                                </Grid>
                            </Grid>
                        </FormSection>
                        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={saving || !form.name || !form.country}>
                            {saving ? 'Saving…' : 'Save organization'}
                        </Button>
                    </Box>
                </Surface>
            </QueryState>
        </WorkspaceFrame>
    );
}
