import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import { vendorOnboardingAPI } from '../services/api';
import { formatShortDate } from '../utils/humanizeLabel';
import { CUSTOMER_STAGES, customerStage } from '../experience/customerStages';
import { PageShell, SectionHeader } from '../components/experience/ExperienceKit';

type Owner = { id: string; name: string; email: string };
type Duplicate = { id: string; publicId?: string; name: string; matchReason: string; status: string };
type Row = { id: string; publicId?: string; name: string; stage: string; owner: string; dueDate?: string | null; nextAction: string };

const empty = {
    name: '',
    legalName: '',
    website: '',
    country: '',
    servicesProvided: '',
    businessOwnerUserId: '',
    businessUnit: '',
    estimatedAnnualSpend: '',
    targetStartDate: '',
};

export default function VendorOnboarding() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<Row[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [form, setForm] = useState(empty);
    const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = () => {
        Promise.all([vendorOnboardingAPI.list(), vendorOnboardingAPI.owners().catch(() => ({ data: { data: [] } }))])
            .then(([list, directory]) => {
                setRows(list.data.data || []);
                setOwners(directory.data.data || []);
            })
            .catch((err) => setError(err.message || 'Unable to load onboarding'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const submit = async (event: FormEvent, acknowledgeDuplicate = false) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (!acknowledgeDuplicate) {
                const check = await vendorOnboardingAPI.duplicates({ name: form.name, website: form.website });
                const found = check.data.data || [];
                if (found.length) {
                    setDuplicates(found);
                    setSaving(false);
                    return;
                }
            }
            const created = await vendorOnboardingAPI.create({
                name: form.name.trim(),
                legalName: form.legalName.trim() || undefined,
                website: form.website ? (form.website.startsWith('http') ? form.website : `https://${form.website}`) : undefined,
                country: form.country || undefined,
                servicesProvided: form.servicesProvided.trim(),
                businessOwnerUserId: form.businessOwnerUserId || undefined,
                businessUnit: form.businessUnit || undefined,
                estimatedAnnualSpend: form.estimatedAnnualSpend ? Number(form.estimatedAnnualSpend) : undefined,
                targetStartDate: form.targetStartDate || undefined,
                acknowledgeDuplicate,
            });
            navigate(`/vendor-onboarding/${created.data.data.publicId || created.data.data.id}`);
        } catch (err: any) {
            setError(err.message || 'Unable to start onboarding');
        } finally {
            setSaving(false);
        }
    };

    return (
        <QueryState loading={loading && !rows.length} error={null} empty={false}>
            <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'Request' }]}
                title="Request a third party"
                description="Name the vendor, the service, and the internal owner. Supreme then opens Assess. No questionnaire is sent to the vendor yet."
            />
            <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                {error && <Alert severity="error">{error}</Alert>}
                <Surface>
                    <Typography variant="h6">New request</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Ask only what is needed now. After you submit, Supreme opens Assess for the internal contact. The vendor is not invited yet.</Typography>
                    <Stack component="form" onSubmit={(event) => submit(event)} spacing={2}>
                        <Stack spacing={1.25}>
                            <Typography variant="subtitle2">Who is this vendor?</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField required fullWidth label="Vendor name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} helperText={!form.name ? 'Required to open a request.' : undefined} />
                                <TextField fullWidth label="Legal name" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
                            </Stack>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField fullWidth label="Website or domain" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
                                <TextField fullWidth label="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
                            </Stack>
                        </Stack>
                        <Stack spacing={1.25}>
                            <Typography variant="subtitle2">What service will they provide?</Typography>
                            <TextField required fullWidth multiline minRows={2} label="Service or product" value={form.servicesProvided} onChange={(event) => setForm({ ...form, servicesProvided: event.target.value })} helperText={!form.servicesProvided ? 'Required. Describe the work this third party will do.' : undefined} />
                        </Stack>
                        <Stack spacing={1.25}>
                            <Typography variant="subtitle2">Who owns this relationship internally?</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField select fullWidth label="Business owner" value={form.businessOwnerUserId} onChange={(event) => setForm({ ...form, businessOwnerUserId: event.target.value })}>
                                    <MenuItem value="">Assign after create</MenuItem>
                                    {owners.map((owner) => <MenuItem key={owner.id} value={owner.id}>{owner.name}</MenuItem>)}
                                </TextField>
                                <TextField fullWidth label="Business unit" value={form.businessUnit} onChange={(event) => setForm({ ...form, businessUnit: event.target.value })} />
                            </Stack>
                        </Stack>
                        <Stack spacing={1.25}>
                            <Typography variant="subtitle2">Context only</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField fullWidth type="number" label="Estimated annual spend" value={form.estimatedAnnualSpend} onChange={(event) => setForm({ ...form, estimatedAnnualSpend: event.target.value })} helperText="Context for the owner. Spend does not change inherent or residual risk." />
                                <TextField fullWidth type="date" label="Target start date" InputLabelProps={{ shrink: true }} value={form.targetStartDate} onChange={(event) => setForm({ ...form, targetStartDate: event.target.value })} />
                            </Stack>
                        </Stack>
                        <Button type="submit" variant="contained" disabled={saving || !form.name || !form.servicesProvided}>Submit request</Button>
                        <Typography variant="body2">Next: the named internal contact answers intake. Supreme scores inherent risk and recommends tier and packs.</Typography>
                    </Stack>
                </Surface>
                <Surface>
                    <SectionHeader title="Open work" body={CUSTOMER_STAGES.map((stage) => `${stage} ${rows.filter((row) => customerStage(row.stage) === stage).length}`).join(' · ')} />
                    <AppTable
                        rows={rows}
                        rowKey={(row) => row.id}
                        onRowClick={(row) => navigate(`/vendor-onboarding/${row.publicId || row.id}`)}
                        emptyTitle="No open onboarding"
                        emptyBody="Start a request to open intake for a business owner."
                        columns={[
                            { id: 'vendor', label: 'Vendor', render: (row) => (
                                <BoxText title={row.name} caption={row.publicId || 'ID pending'} />
                            ) },
                            { id: 'stage', label: 'Stage', render: (row) => <StatusBadge kind="plain" label={customerStage(row.stage)} /> },
                            { id: 'owner', label: 'Owner', hideOnMobile: true, render: (row) => row.owner },
                            { id: 'due', label: 'Due', hideOnMobile: true, render: (row) => formatShortDate(row.dueDate) },
                            { id: 'next', label: 'Next action', render: (row) => row.nextAction },
                        ]}
                    />
                </Surface>
            </Stack>
            <Dialog open={duplicates.length > 0} onClose={() => setDuplicates([])} fullWidth maxWidth="sm">
                <DialogTitle>Possible existing third party found</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>Supreme found a likely match. Use the existing vendor unless you are sure this is a new relationship.</Typography>
                    {duplicates.map((row) => (
                        <Surface key={row.id}>
                            <Typography variant="subtitle2">{row.name}</Typography>
                            <Typography variant="body2">{row.publicId || 'Existing record'} · {row.matchReason}</Typography>
                            <Button sx={{ mt: 1 }} onClick={() => navigate('/vendor-management')}>Use existing vendor</Button>
                        </Surface>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDuplicates([])}>Cancel</Button>
                    <Button variant="contained" onClick={(event) => { setDuplicates([]); submit(event as unknown as FormEvent, true); }}>Continue with new request</Button>
                </DialogActions>
            </Dialog>
            </PageShell>
        </QueryState>
    );
}

function BoxText({ title, caption }: { title: string; caption: string }) {
    return (
        <>
            <Typography variant="subtitle2">{title}</Typography>
            <Typography variant="caption">{caption}</Typography>
        </>
    );
}
