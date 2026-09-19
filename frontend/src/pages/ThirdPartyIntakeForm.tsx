import { FormEvent, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import FormSection from '../components/design/FormSection';
import Surface from '../components/design/Surface';
import { PageShell } from '../components/experience/ExperienceKit';
import { intakeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const empty = {
    requesterName: '',
    requesterEmail: '',
    requesterBusinessUnit: '',
    businessOwnerName: '',
    businessOwnerEmail: '',
    proposedThirdPartyName: '',
    proposedServiceName: '',
    vendorWebsite: '',
    vendorContactName: '',
    vendorContactEmail: '',
    businessPurpose: '',
    whyNeeded: '',
    targetStartDate: '',
    priority: 'MEDIUM',
    procurementReference: '',
    estimatedSpend: '',
    receivesCompanyOrCustomerInformation: false,
    connectsToCompanySystems: false,
    supportsImportantOperation: false,
    interactsWithCustomers: false,
    usesAiOrAutomatedDecisions: false,
    processesPaymentsOrFunds: false,
};

export default function ThirdPartyIntakeForm() {
    const { user } = useAuth();
    const [form, setForm] = useState({
        ...empty,
        requesterName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
        requesterEmail: user?.email || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<null | {
        reference: string;
        proposedThirdParty: string;
        service: string;
        currentStatus: string;
        emailHonestStatus?: string;
    }>(null);

    const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const created = await intakeAPI.create({
                requesterName: form.requesterName.trim(),
                requesterEmail: form.requesterEmail.trim(),
                requesterBusinessUnit: form.requesterBusinessUnit.trim() || undefined,
                businessOwnerName: form.businessOwnerName.trim() || undefined,
                businessOwnerEmail: form.businessOwnerEmail.trim() || undefined,
                proposedThirdPartyName: form.proposedThirdPartyName.trim(),
                proposedServiceName: form.proposedServiceName.trim(),
                vendorWebsite: form.vendorWebsite.trim() || undefined,
                vendorContactName: form.vendorContactName.trim() || undefined,
                vendorContactEmail: form.vendorContactEmail.trim() || undefined,
                businessPurpose: [form.businessPurpose.trim(), form.whyNeeded.trim() && `Why needed: ${form.whyNeeded.trim()}`].filter(Boolean).join('\n\n'),
                targetStartDate: form.targetStartDate || undefined,
                priority: form.priority,
                procurementReference: form.procurementReference.trim() || undefined,
                estimatedSpend: form.estimatedSpend ? Number(form.estimatedSpend) : undefined,
                routingFacts: {
                    receivesCompanyOrCustomerInformation: form.receivesCompanyOrCustomerInformation,
                    connectsToCompanySystems: form.connectsToCompanySystems,
                    supportsImportantOperation: form.supportsImportantOperation,
                    interactsWithCustomers: form.interactsWithCustomers,
                    usesAiOrAutomatedDecisions: form.usesAiOrAutomatedDecisions,
                    processesPaymentsOrFunds: form.processesPaymentsOrFunds,
                },
            });
            const data = created.data.data;
            setConfirmation({
                reference: data.confirmation.reference,
                proposedThirdParty: data.confirmation.proposedThirdParty,
                service: data.confirmation.service,
                currentStatus: data.confirmation.currentStatus,
                emailHonestStatus: data.requesterAcknowledgement?.emailHonestStatus,
            });
        } catch (err: any) {
            setError(err.response?.data?.error?.message || err.message || 'Unable to submit the request.');
        } finally {
            setSaving(false);
        }
    };

    if (confirmation) {
        return (
            <PageShell>
                <PageHeader
                    crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'Request' }]}
                    title="Thank you."
                    description="Your third-party request has been submitted."
                />
                <Surface>
                    <Stack spacing={1.25} sx={{ maxWidth: 560 }}>
                        <Typography>Reference: {confirmation.reference}</Typography>
                        <Typography>Proposed third party: {confirmation.proposedThirdParty}</Typography>
                        <Typography>Service: {confirmation.service}</Typography>
                        <Typography>Current status: {confirmation.currentStatus}</Typography>
                        {confirmation.emailHonestStatus && confirmation.emailHonestStatus !== 'DELIVERED' && (
                            <Typography variant="body2">Email status: {confirmation.emailHonestStatus}. Queued or accepted is not inbox delivery.</Typography>
                        )}
                        <Button href={`/third-parties/intake/${confirmation.reference}`} sx={{ alignSelf: 'flex-start' }}>View request</Button>
                    </Stack>
                </Surface>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'Request' }]}
                title="Request a Third Party or Service"
                description="Tell us what you want to use. GRC will review this request. This is not a risk assessment."
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={submit} sx={{ maxWidth: 760, minWidth: 0 }}>
                <Stack spacing={2.5}>
                    <FormSection title="About you">
                        <Stack spacing={2}>
                            <TextField required label="Name" value={form.requesterName} onChange={(event) => set('requesterName', event.target.value)} />
                            <TextField required type="email" label="Work email" value={form.requesterEmail} onChange={(event) => set('requesterEmail', event.target.value)} />
                            <TextField label="Business unit / department" value={form.requesterBusinessUnit} onChange={(event) => set('requesterBusinessUnit', event.target.value)} />
                            <TextField label="Business owner / manager if known" value={form.businessOwnerName} onChange={(event) => set('businessOwnerName', event.target.value)} />
                            <TextField type="email" label="Business owner email" value={form.businessOwnerEmail} onChange={(event) => set('businessOwnerEmail', event.target.value)} />
                        </Stack>
                    </FormSection>
                    <FormSection title="What do you want to use?">
                        <Stack spacing={2}>
                            <TextField required label="Company / vendor name" value={form.proposedThirdPartyName} onChange={(event) => set('proposedThirdPartyName', event.target.value)} />
                            <TextField required label="Product / service name" value={form.proposedServiceName} onChange={(event) => set('proposedServiceName', event.target.value)} />
                            <TextField label="Company website if known" value={form.vendorWebsite} onChange={(event) => set('vendorWebsite', event.target.value)} />
                            <TextField label="Vendor contact name" value={form.vendorContactName} onChange={(event) => set('vendorContactName', event.target.value)} />
                            <TextField type="email" label="Vendor contact email" value={form.vendorContactEmail} onChange={(event) => set('vendorContactEmail', event.target.value)} />
                        </Stack>
                    </FormSection>
                    <FormSection title="Business need">
                        <Stack spacing={2}>
                            <TextField required multiline minRows={3} label="What will the service be used for?" value={form.businessPurpose} onChange={(event) => set('businessPurpose', event.target.value)} />
                            <TextField multiline minRows={2} label="Why is it needed?" value={form.whyNeeded} onChange={(event) => set('whyNeeded', event.target.value)} />
                            <TextField type="date" label="Target start / go-live date" InputLabelProps={{ shrink: true }} value={form.targetStartDate} onChange={(event) => set('targetStartDate', event.target.value)} />
                            <TextField select label="Urgency" value={form.priority} onChange={(event) => set('priority', event.target.value)}>
                                <MenuItem value="LOW">Low</MenuItem>
                                <MenuItem value="MEDIUM">Medium</MenuItem>
                                <MenuItem value="HIGH">High</MenuItem>
                                <MenuItem value="URGENT">Urgent</MenuItem>
                            </TextField>
                            <TextField label="Procurement / reference number" value={form.procurementReference} onChange={(event) => set('procurementReference', event.target.value)} />
                            <TextField type="number" label="Estimated spend if known" value={form.estimatedSpend} onChange={(event) => set('estimatedSpend', event.target.value)} />
                        </Stack>
                    </FormSection>
                    <FormSection title="Initial routing questions" body="These help GRC route the request. They do not score inherent risk.">
                        <Stack>
                            {[
                                ['receivesCompanyOrCustomerInformation', 'Will the third party receive company or customer information?'],
                                ['connectsToCompanySystems', 'Will it connect to company systems?'],
                                ['supportsImportantOperation', 'Will it support an important business operation?'],
                                ['interactsWithCustomers', 'Will it interact directly with customers?'],
                                ['usesAiOrAutomatedDecisions', 'Will it use AI or automated decisions?'],
                                ['processesPaymentsOrFunds', 'Will it process payments or funds?'],
                            ].map(([key, label]) => (
                                <FormControlLabel key={key} control={<Switch checked={Boolean((form as any)[key])} onChange={(event) => set(key, event.target.checked)} />} label={label} />
                            ))}
                        </Stack>
                    </FormSection>
                    <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</Button>
                </Stack>
            </Box>
        </PageShell>
    );
}
