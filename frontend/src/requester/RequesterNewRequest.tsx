import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, FormControlLabel, MenuItem, Stack, Step, StepLabel, Stepper, Switch, TextField, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { requesterAPI } from '../services/api';
import { color } from '../design/tokens';

const STEPS = ['About you', 'Third party / service', 'Business need', 'Initial routing', 'Review & submit'];

const empty = {
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

export default function RequesterNewRequest() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const identityName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const identityEmail = user?.email || '';
    const [form, setForm] = useState(empty);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [colleagues, setColleagues] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [confirmation, setConfirmation] = useState<null | {
        publicId: string;
        proposedThirdPartyName: string;
        proposedServiceName: string;
        requesterStatus: string;
        submittedAt?: string;
        emailHonestStatus?: string;
    }>(null);

    useEffect(() => {
        requesterAPI.colleagues().then((res) => setColleagues(res.data.data || [])).catch(() => undefined);
    }, []);

    const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

    const canContinue = useMemo(() => {
        if (step === 1) return Boolean(form.proposedThirdPartyName.trim() && form.proposedServiceName.trim());
        if (step === 2) return Boolean(form.businessPurpose.trim());
        if (step === 4 && ((form.businessOwnerName && !form.businessOwnerEmail) || (form.businessOwnerEmail && !form.businessOwnerName))) return false;
        return true;
    }, [form, step]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (step < 4) {
            setStep((value) => value + 1);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const created = await requesterAPI.create({
                requesterName: identityName,
                requesterEmail: identityEmail,
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
                publicId: data.publicId,
                proposedThirdPartyName: data.proposedThirdPartyName,
                proposedServiceName: data.proposedServiceName,
                requesterStatus: data.requesterStatus,
                submittedAt: data.submittedAt,
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
            <Stack spacing={2} sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: { xs: 2, md: 4 } }}>
                <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 36 }}>Thank you</Typography>
                <Typography>Your request has been submitted to the GRC team.</Typography>
                <Typography><strong>Reference:</strong> {confirmation.publicId}</Typography>
                <Typography><strong>Third party:</strong> {confirmation.proposedThirdPartyName}</Typography>
                <Typography><strong>Service:</strong> {confirmation.proposedServiceName}</Typography>
                {confirmation.submittedAt && <Typography><strong>Submitted:</strong> {new Date(confirmation.submittedAt).toLocaleString()}</Typography>}
                <Typography><strong>Current status:</strong> {confirmation.requesterStatus}</Typography>
                <Typography>Next: The TPRM team will review your request and contact you if more information is needed.</Typography>
                {confirmation.emailHonestStatus && confirmation.emailHonestStatus !== 'DELIVERED' && (
                    <Typography variant="body2">Email status: {confirmation.emailHonestStatus}. Queued or accepted is not inbox delivery.</Typography>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button variant="contained" onClick={() => navigate(`/request/${confirmation.publicId}`)}>View request</Button>
                    <Button variant="outlined" onClick={() => { setConfirmation(null); setForm(empty); setStep(0); }}>Submit another request</Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <Box component="form" onSubmit={submit} sx={{ bgcolor: color.surface, border: `1px solid ${color.line}`, borderRadius: 2, p: { xs: 2, md: 4 } }}>
            <Typography variant="h1" sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: { xs: 28, md: 36 }, mb: 1 }}>Request a third party or service</Typography>
            <Typography sx={{ color: color.inkMuted, mb: 3 }}>Tell us what you want to use. GRC will review this. This is not a risk assessment.</Typography>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, display: { xs: 'none', md: 'flex' } }}>
                {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
            <Typography sx={{ display: { md: 'none' }, mb: 2, fontWeight: 700 }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {step === 0 && (
                <Stack spacing={2}>
                    <TextField id="requester-name" label="Name" value={identityName} InputProps={{ readOnly: true }} helperText="From your Supreme account" inputProps={{ 'aria-label': 'Name' }} />
                    <TextField id="requester-email" label="Work email" value={identityEmail} InputProps={{ readOnly: true }} inputProps={{ 'aria-label': 'Work email' }} />
                    <TextField label="Business unit / department" value={form.requesterBusinessUnit} onChange={(event) => set('requesterBusinessUnit', event.target.value)} />
                    <Autocomplete
                        freeSolo
                        options={colleagues}
                        getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} · ${option.email}`}
                        onChange={(_event, value) => {
                            if (value && typeof value !== 'string') {
                                setForm((current) => ({ ...current, businessOwnerName: value.name, businessOwnerEmail: value.email }));
                            }
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Business owner / manager if known" value={form.businessOwnerName} onChange={(event) => set('businessOwnerName', event.target.value)} />
                        )}
                    />
                    <TextField type="email" label="Business owner email if known" value={form.businessOwnerEmail} onChange={(event) => set('businessOwnerEmail', event.target.value)} helperText="If one owner field is filled, both are required." />
                </Stack>
            )}
            {step === 1 && (
                <Stack spacing={2} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <TextField id="proposed-third-party" required label="Company / vendor name" value={form.proposedThirdPartyName} onChange={(event) => set('proposedThirdPartyName', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} inputProps={{ 'aria-label': 'Company / vendor name' }} />
                    <TextField id="proposed-service" required label="Product / service name" value={form.proposedServiceName} onChange={(event) => set('proposedServiceName', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} inputProps={{ 'aria-label': 'Product / service name' }} />
                    <TextField label="Company website if known" value={form.vendorWebsite} onChange={(event) => set('vendorWebsite', event.target.value)} />
                    <TextField label="Vendor contact name" value={form.vendorContactName} onChange={(event) => set('vendorContactName', event.target.value)} />
                    <TextField type="email" label="Vendor contact email" value={form.vendorContactEmail} onChange={(event) => set('vendorContactEmail', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} />
                </Stack>
            )}
            {step === 2 && (
                <Stack spacing={2} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <TextField id="business-purpose" required multiline minRows={3} label="What will the service be used for?" value={form.businessPurpose} onChange={(event) => set('businessPurpose', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} inputProps={{ 'aria-label': 'What will the service be used for?' }} />
                    <TextField multiline minRows={2} label="Why is it needed?" value={form.whyNeeded} onChange={(event) => set('whyNeeded', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} />
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
            )}
            {step === 3 && (
                <Stack>
                    <Typography sx={{ mb: 1, color: color.inkMuted }}>These help GRC route the request. They do not score inherent risk.</Typography>
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
            )}
            {step === 4 && (
                <Stack spacing={1.25}>
                    <Typography><strong>Requested by:</strong> {identityName} · {identityEmail}</Typography>
                    <Typography><strong>Third party:</strong> {form.proposedThirdPartyName}</Typography>
                    <Typography><strong>Service:</strong> {form.proposedServiceName}</Typography>
                    <Typography><strong>Need:</strong> {form.businessPurpose}</Typography>
                    {form.businessOwnerName && <Typography><strong>Business owner:</strong> {form.businessOwnerName} · {form.businessOwnerEmail}</Typography>}
                </Stack>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                {step > 0 && <Button type="button" onClick={() => setStep((value) => value - 1)}>Back</Button>}
                <Button type="submit" variant="contained" disabled={saving || !canContinue}>
                    {step < 4 ? 'Continue' : saving ? 'Submitting…' : 'Submit request'}
                </Button>
            </Stack>
        </Box>
    );
}
