import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import FactList from '../components/design/FactList';
import QueryState from '../components/QueryState';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import WorkflowStepper from '../components/design/WorkflowStepper';
import AppTable from '../components/design/AppTable';
import AttentionStrip from '../components/design/AttentionStrip';
import { aiGovernanceAPI, insuranceAPI, vendorAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canSeeNav } from '../security/navAccess';

const TABS = [
    { label: 'Overview', path: '/insurance' },
    { label: 'Entities', path: '/insurance/entities' },
    { label: 'Licenses', path: '/insurance/licenses' },
    { label: 'Risk', path: '/insurance/risk' },
    { label: 'Third Parties', path: '/insurance/third-parties' },
    { label: 'Claims', path: '/insurance/claims' },
    { label: 'Underwriting', path: '/insurance/underwriting' },
    { label: 'Reinsurance', path: '/insurance/reinsurance' },
    { label: 'Controls & Evidence', path: '/insurance/controls' },
    { label: 'AI / Models', path: '/insurance/ai' },
    { label: 'Regulatory', path: '/insurance/regulatory' },
    { label: 'Reports', path: '/insurance/reports' },
    { label: 'Configuration', path: '/insurance/configuration' },
];

const WIZARD = ['Type', 'Domicile', 'Jurisdictions', 'Lines', 'Activities', 'Data', 'AI', 'Third parties', 'Packs', 'Risk packs', 'Review', 'Activate'];

const AI_USAGE = [
    { key: 'UNDERWRITING', label: 'Underwriting models' },
    { key: 'PRICING', label: 'Pricing models' },
    { key: 'CLAIMS', label: 'Claims models' },
    { key: 'FRAUD', label: 'Fraud / SIU models' },
    { key: 'NONE', label: 'No models in scope yet' },
];

function toggle(list: string[], key: string) {
    return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
}

function metricLabel(row?: { value: number | null; basis?: string }) {
    if (!row || row.value === null || row.basis === 'NOT_CONFIGURED' || row.basis === 'NOT_CALCULATED') return 'Not calculated';
    return String(row.value);
}

function ChipPicker({ items, selected, onToggle }: { items: Array<{ key: string; label: string }>; selected: string[]; onToggle: (key: string) => void }) {
    return (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ maxWidth: '100%' }}>
            {items.map((row) => (
                <Chip key={row.key} label={row.label} color={selected.includes(row.key) ? 'primary' : 'default'} onClick={() => onToggle(row.key)} sx={{ maxWidth: '100%' }} />
            ))}
        </Stack>
    );
}

export default function InsuranceHome() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const canConfigure = canSeeNav(user?.role, 'organization.manage', user?.permissions);
    const canManageRecords = canSeeNav(user?.role, 'insurance.manage', user?.permissions) || canConfigure;
    const tab = Math.max(0, TABS.findIndex((row) => row.path === location.pathname));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [overview, setOverview] = useState<any>(null);
    const [catalog, setCatalog] = useState<any>(null);
    const [entities, setEntities] = useState<any[]>([]);
    const [licenses, setLicenses] = useState<any[]>([]);
    const [risks, setRisks] = useState<any>(null);
    const [graph, setGraph] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [regulatory, setRegulatory] = useState<any>(null);
    const [claims, setClaims] = useState<any>(null);
    const [underwriting, setUnderwriting] = useState<any>(null);
    const [reinsurance, setReinsurance] = useState<any>(null);
    const [licenseWatch, setLicenseWatch] = useState<any[]>([]);
    const [signals, setSignals] = useState<any[]>([]);
    const [reports, setReports] = useState<any>(null);
    const [aiContexts, setAiContexts] = useState<any[]>([]);
    const [concentration, setConcentration] = useState<any>(null);
    const [showEntityForm, setShowEntityForm] = useState(false);
    const [showLicenseForm, setShowLicenseForm] = useState(false);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<any>({
        organizationType: '',
        domicileCountryCode: '',
        domicileSubJurisdiction: '',
        operatingJurisdictions: [] as string[],
        linesOfBusiness: [] as string[],
        activities: [] as string[],
        dataHandled: [] as string[],
        aiUsage: [] as string[],
        thirdPartyEcosystem: [] as string[],
        enabledPacks: [] as string[],
        recommendationDecisions: {} as Record<string, string>,
    });
    const [entityForm, setEntityForm] = useState({ name: '', organizationType: '', domicileCountryCode: '', domicileSubJurisdiction: '', linesOfBusiness: [] as string[], isGroup: false, parentPublicId: '' });
    const [licenseForm, setLicenseForm] = useState({ entityPublicId: '', authorityKey: '', jurisdictionCode: '', licenseType: '', reference: '', status: 'UNKNOWN', effectiveDate: '', expiryDate: '', verificationBasis: 'CUSTOMER_RECORDED', reviewDueAt: '' });
    const [vendorForm, setVendorForm] = useState({ vendorId: '', serviceCategory: '', jurisdictionCode: '', entityId: '', linesOfBusiness: [] as string[], claimsAuthority: false, underwritingAuthority: false, policyholderInteraction: false, premiumHandling: false, licenseRequired: false, aiModelProvider: false, regulatedOutsourcing: false, fourthPartyUse: false, criticality: '' });
    const [existingVendors, setExistingVendors] = useState<any[]>([]);
    const [aiSystems, setAiSystems] = useState<any[]>([]);
    const [aiForm, setAiForm] = useState({ aiSystemId: '', entityId: '', insuranceUseCase: 'CLAIMS', lineOfBusiness: 'MOTOR', jurisdictionCode: 'NG', underwritingInfluence: false, pricingInfluence: false, claimsInfluence: true, fraudInfluence: false, consumerImpact: false, externalData: false, thirdPartyProvider: '', validationStatus: '', biasReviewStatus: '', explainability: '', humanOversight: 'Required', nextReviewAt: '' });
    const [applicabilityForm, setApplicabilityForm] = useState({ packKey: '', state: 'APPLICABLE', reason: '' });
    const [authorityForm, setAuthorityForm] = useState({ kind: 'CLAIMS', delegateName: '', scope: '', limits: '' });
    const [counterpartyForm, setCounterpartyForm] = useState({ name: '', relationshipType: 'TREATY', jurisdictionCode: 'NG', criticality: 'MATERIAL' });

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [over, cat, ents, lics, risk, links, classified, regs, clm, uw, rei, watch, sig, reps, models, conc, vendorList, systems] = await Promise.all([
                insuranceAPI.overview(),
                insuranceAPI.catalog(),
                insuranceAPI.entities().catch(() => ({ data: { data: [] } })),
                insuranceAPI.licenses().catch(() => ({ data: { data: [] } })),
                insuranceAPI.risks().catch(() => ({ data: { data: null } })),
                insuranceAPI.graph().catch(() => ({ data: { data: [] } })),
                insuranceAPI.vendors().catch(() => ({ data: { data: [] } })),
                insuranceAPI.regulatory().catch(() => ({ data: { data: null } })),
                insuranceAPI.claims().catch(() => ({ data: { data: null } })),
                insuranceAPI.underwriting().catch(() => ({ data: { data: null } })),
                insuranceAPI.reinsurance().catch(() => ({ data: { data: null } })),
                insuranceAPI.licenseAttention().catch(() => ({ data: { data: [] } })),
                insuranceAPI.signals().catch(() => ({ data: { data: [] } })),
                insuranceAPI.reports().catch(() => ({ data: { data: null } })),
                insuranceAPI.aiContexts().catch(() => ({ data: { data: [] } })),
                insuranceAPI.concentration().catch(() => ({ data: { data: null } })),
                vendorAPI.getAll().catch(() => ({ data: { vendors: [] } })),
                aiGovernanceAPI.systems().catch(() => ({ data: { data: [] } })),
            ]);
            setOverview(over.data.data);
            setCatalog(cat.data.data);
            setEntities(ents.data.data || []);
            setLicenses(lics.data.data || []);
            setRisks(risk.data.data);
            setGraph(links.data.data || []);
            setVendors(classified.data.data || []);
            setRegulatory(regs.data.data);
            setClaims(clm.data.data);
            setUnderwriting(uw.data.data);
            setReinsurance(rei.data.data);
            setLicenseWatch(watch.data.data || []);
            setSignals(sig.data.data || []);
            setReports(reps.data.data);
            setAiContexts(models.data.data || []);
            setConcentration(conc.data.data);
            setExistingVendors(vendorList.data.vendors || vendorList.data.data || []);
            setAiSystems(systems.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load Insurance Edition');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const recommended = useMemo(() => {
        if (!catalog) return [];
        const countries = [draft.domicileCountryCode, ...draft.operatingJurisdictions, draft.domicileSubJurisdiction].filter(Boolean);
        const hay = new Set([
            draft.organizationType,
            ...draft.operatingJurisdictions,
            ...draft.activities,
            ...draft.dataHandled,
            draft.domicileCountryCode,
            draft.domicileSubJurisdiction,
            '*',
            ...countries.map((country: string) => `${country}+${draft.organizationType}`),
            ...draft.activities.map((activity: string) => `${draft.domicileCountryCode}+${activity}`),
        ]);
        const operational = (catalog.packs || []).filter((pack: any) => (pack.recommendationTriggers || []).some((key: string) => hay.has(key)));
        const regulatoryPacks = (catalog.regulatoryPacks || []).filter((pack: any) => {
            if ((pack.excludeTypes || []).includes(draft.organizationType)) return false;
            return (pack.recommendationTriggers || []).some((key: string) => hay.has(key));
        });
        return [...operational, ...regulatoryPacks];
    }, [catalog, draft]);

    const activate = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!draft.organizationType || !draft.domicileCountryCode) {
            setError('Select an organization type and domicile. Supreme does not prefill production applicability.');
            return;
        }
        try {
            await insuranceAPI.activate({
                ...draft,
                enabledPacks: recommended.map((row: any) => row.key).filter((key: string) => draft.recommendationDecisions[key] !== 'rejected'),
            });
            setMessage('Insurance Edition activated. Recommended packs are not legal requirements.');
            await load();
            navigate('/insurance');
        } catch (err: any) {
            setError(err.message || 'Unable to activate');
        }
    };

    const addEntity = async (event: FormEvent) => {
        event.preventDefault();
        const parent = entities.find((row) => row.publicId === entityForm.parentPublicId);
        await insuranceAPI.createEntity({
            name: entityForm.name,
            organizationType: entityForm.organizationType,
            domicileCountryCode: entityForm.domicileCountryCode,
            domicileSubJurisdiction: entityForm.domicileSubJurisdiction || undefined,
            linesOfBusiness: entityForm.linesOfBusiness,
            isGroup: entityForm.isGroup,
            parentEntityId: parent?.id,
        });
        setEntityForm({ ...entityForm, name: '' });
        setShowEntityForm(false);
        setMessage('Entity recorded.');
        await load();
    };

    const addLicense = async (event: FormEvent) => {
        event.preventDefault();
        await insuranceAPI.createLicense(licenseForm);
        setShowLicenseForm(false);
        setMessage('License metadata recorded. This is not a legal determination.');
        await load();
    };

    const classifyExistingVendor = async (event: FormEvent) => {
        event.preventDefault();
        await insuranceAPI.classifyVendor(vendorForm);
        setMessage('Vendor classified on the existing Third Party record. No duplicate vendor was created.');
        await load();
    };

    const saveAiContext = async (event: FormEvent) => {
        event.preventDefault();
        await insuranceAPI.upsertAiContext(aiForm);
        setMessage('Insurance context attached to the existing AI system. This is not a second inventory.');
        await load();
    };

    const reviewPack = async (event: FormEvent) => {
        event.preventDefault();
        await insuranceAPI.reviewApplicability(applicabilityForm);
        setMessage('Applicability recorded. Supreme did not make a legal determination.');
        await load();
    };

    const addAuthority = async (event: FormEvent) => {
        event.preventDefault();
        await insuranceAPI.createDelegatedAuthority(authorityForm);
        setMessage('Delegated authority metadata recorded. Not a legal interpretation of the grant.');
        await load();
    };

    const addCounterparty = async (event: FormEvent) => {
        event.preventDefault();
        await insuranceAPI.createCounterparty(counterpartyForm);
        setMessage('Reinsurance relationship recorded. Not placement or treaty administration.');
        await load();
    };

    const showWizard = !overview?.activated || location.pathname === '/insurance/activate';
    const typesForDraft = (catalog?.organizationTypes || []).filter((row: any) => {
        if (draft.domicileCountryCode === 'NG') return ['INSURER', 'REINSURER', 'BROKER', 'LOSS_ADJUSTER', 'AGENT_INTERMEDIARY', 'MICROINSURANCE_OPERATOR', 'TAKAFUL_OPERATOR', 'INSURTECH', 'INSURANCE_SERVICE_COMPANY', 'OTHER'].includes(row.key);
        if (draft.domicileCountryCode === 'US') return ['INSURER', 'REINSURER', 'BROKER', 'AGENCY', 'MGA', 'MGU', 'TPA', 'CAPTIVE', 'INSURTECH', 'OTHER'].includes(row.key);
        return true;
    });

    return (
        <WorkspaceFrame purpose="register">
            <Box sx={{ overflowX: 'hidden', maxWidth: '100%' }}>
            <PageHeader
                crumbs={[{ label: 'Programs' }, { label: 'Insurance' }]}
                title="Insurance Edition"
                description="A configurable industry layer on Supreme. Not a separate product. Recommended is not required."
                actions={overview?.activated && canConfigure ? <Button onClick={() => navigate('/insurance/activate')}>Revise configuration</Button> : undefined}
            />
            <QueryState loading={loading} error={error} empty={!overview && !catalog} emptyTitle="Insurance Edition" emptyBody="Catalog could not be loaded.">
                <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                    {message && <Alert severity="success">{message}</Alert>}
                    <Tabs
                        value={tab === -1 ? 0 : tab}
                        onChange={(_e, value) => navigate(TABS[value].path)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {TABS.map((row) => <Tab key={row.path} label={row.label} />)}
                    </Tabs>

                    {(tab <= 0 || showWizard) && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">{overview?.honesty || catalog?.honesty}</Alert>
                            {showWizard && canConfigure && (
                                <Surface>
                                    <Typography variant="h6" sx={{ mb: 0.5 }}>Activate Insurance Edition</Typography>
                                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Twelve steps. Nothing is preselected. Pack recommendations follow your answers. They are not legal requirements and empty answers stay empty.</Typography>
                                    <WorkflowStepper steps={WIZARD} active={step} compact />
                                    <Box component="form" onSubmit={activate} sx={{ mt: 2 }}>
                                        {step === 0 && (
                                            <TextField select fullWidth label="Organization type" value={draft.organizationType} onChange={(e) => setDraft({ ...draft, organizationType: e.target.value })}>
                                                <MenuItem value="">Not selected</MenuItem>
                                                {typesForDraft.map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                        )}
                                        {step === 1 && (
                                            <Stack spacing={2}>
                                                <TextField select fullWidth label="Domicile" value={draft.domicileCountryCode} onChange={(e) => setDraft({ ...draft, domicileCountryCode: e.target.value, domicileSubJurisdiction: '' })}>
                                                    <MenuItem value="">Not selected</MenuItem>
                                                    {(catalog?.countries || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                                </TextField>
                                                {draft.domicileCountryCode === 'US' && (
                                                    <TextField select fullWidth label="State of domicile" value={draft.domicileSubJurisdiction} onChange={(e) => setDraft({ ...draft, domicileSubJurisdiction: e.target.value })}>
                                                        {(catalog?.subJurisdictions || []).filter((row: any) => row.country === 'US').map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                                    </TextField>
                                                )}
                                            </Stack>
                                        )}
                                        {step === 2 && <ChipPicker items={catalog?.countries || []} selected={draft.operatingJurisdictions} onToggle={(key) => setDraft({ ...draft, operatingJurisdictions: toggle(draft.operatingJurisdictions, key) })} />}
                                        {step === 3 && <ChipPicker items={catalog?.linesOfBusiness || []} selected={draft.linesOfBusiness} onToggle={(key) => setDraft({ ...draft, linesOfBusiness: toggle(draft.linesOfBusiness, key) })} />}
                                        {step === 4 && <ChipPicker items={catalog?.activities || []} selected={draft.activities} onToggle={(key) => setDraft({ ...draft, activities: toggle(draft.activities, key) })} />}
                                        {step === 5 && <ChipPicker items={catalog?.dataHandled || []} selected={draft.dataHandled} onToggle={(key) => setDraft({ ...draft, dataHandled: toggle(draft.dataHandled, key) })} />}
                                        {step === 6 && (
                                            <Stack spacing={1.5}>
                                                <Typography>AI and models stay in Supreme AI Governance. Record only whether they are in scope.</Typography>
                                                <ChipPicker items={AI_USAGE} selected={draft.aiUsage} onToggle={(key) => setDraft({ ...draft, aiUsage: toggle(draft.aiUsage, key) })} />
                                            </Stack>
                                        )}
                                        {step === 7 && (
                                            <Stack spacing={1.5}>
                                                <Typography>Third parties stay in the existing register. Classify them after activation. Do not create duplicate vendor records.</Typography>
                                                <ChipPicker items={catalog?.vendorServiceCategories || []} selected={draft.thirdPartyEcosystem} onToggle={(key) => setDraft({ ...draft, thirdPartyEcosystem: toggle(draft.thirdPartyEcosystem, key) })} />
                                            </Stack>
                                        )}
                                        {step === 8 && (
                                            <Stack spacing={1}>
                                                <Alert severity="info">Recommended based on your configuration. Not legally required.</Alert>
                                                {recommended.map((pack: any) => (
                                                    <Surface key={pack.key}>
                                                        <Typography fontWeight={700}>{pack.label}</Typography>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>{pack.honesty || pack.reason}</Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button size="small" variant={draft.recommendationDecisions[pack.key] !== 'rejected' ? 'contained' : 'outlined'} onClick={() => setDraft({ ...draft, recommendationDecisions: { ...draft.recommendationDecisions, [pack.key]: 'accepted' } })}>Accept recommendation</Button>
                                                            <Button size="small" onClick={() => setDraft({ ...draft, recommendationDecisions: { ...draft.recommendationDecisions, [pack.key]: 'rejected' } })}>Not now</Button>
                                                        </Stack>
                                                    </Surface>
                                                ))}
                                            </Stack>
                                        )}
                                        {step === 9 && <Typography>Risk taxonomy is seeded into Supreme Risk. This is not a second risk register.</Typography>}
                                        {step === 10 && (
                                            <FactList columns={2} items={[
                                                { label: 'Type', value: draft.organizationType },
                                                { label: 'Domicile', value: [draft.domicileCountryCode, draft.domicileSubJurisdiction].filter(Boolean).join(' / ') },
                                                { label: 'Jurisdictions', value: draft.operatingJurisdictions.join(', ') },
                                                { label: 'Lines', value: draft.linesOfBusiness.join(', ') },
                                                { label: 'Activities', value: draft.activities.join(', ') || 'None' },
                                                { label: 'Recommended packs', value: String(recommended.length) },
                                            ]} />
                                        )}
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                                            {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
                                            {step < 11 && <Button variant="contained" onClick={() => setStep(step + 1)}>Continue</Button>}
                                            {step === 11 && <Button type="submit" variant="contained">Activate Insurance Edition</Button>}
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            {overview?.activated && tab <= 0 && (
                                <Stack spacing={2}>
                                    <AttentionStrip items={[
                                        { label: 'Entities', value: metricLabel(overview.metrics?.entities), hint: overview.metrics?.entities?.basis },
                                        { label: 'Jurisdictions', value: metricLabel(overview.metrics?.jurisdictions), hint: overview.metrics?.jurisdictions?.basis },
                                        { label: 'Licenses', value: metricLabel(overview.metrics?.licenses) },
                                        { label: 'Licenses expiring', value: metricLabel(overview.metrics?.licensesExpiring), hint: 'Recorded expiry only. Not a legal finding.' },
                                        { label: 'Insurance third parties', value: metricLabel(overview.metrics?.classifiedVendors) },
                                        { label: 'High insurance risks', value: metricLabel(overview.metrics?.insuranceRisksHighCritical) },
                                    ]} />
                                    <FactList columns={3} items={[
                                        { label: 'AI models due', value: metricLabel(overview.metrics?.aiModelsDue) },
                                        { label: 'High findings', value: metricLabel(overview.metrics?.highFindings) },
                                        { label: 'Evidence expiring', value: metricLabel(overview.metrics?.evidenceExpiring) },
                                    ]} />
                                    {[...(overview.attention || []), ...signals].map((item: any, index: number) => (
                                        <Alert key={`${item.type}-${item.publicId || index}`} severity="warning" action={item.href ? <Button onClick={() => navigate(item.href)}>Open</Button> : undefined}>{item.why}</Alert>
                                    ))}
                                    {concentration && (
                                        <Surface>
                                            <Typography fontWeight={700} sx={{ mb: 1 }}>Concentration (relationship counts)</Typography>
                                            <Typography variant="body2" sx={{ mb: 1 }}>{concentration.honesty}</Typography>
                                            <FactList columns={2} items={(concentration.vendorCategories || []).map((row: any) => ({ label: String(row.category).replace(/_/g, ' '), value: `${row.count} recorded` }))} />
                                        </Surface>
                                    )}
                                    {graph.length > 0 && (
                                        <Surface>
                                            <Typography fontWeight={700} sx={{ mb: 1 }}>Recorded relationships</Typography>
                                            <ChipPicker items={graph.map((row: any) => ({ key: row.id, label: `${row.nodeType.replace(/_/g, ' ')} · ${row.displayLabel}` }))} selected={[]} onToggle={() => undefined} />
                                        </Surface>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/entities' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            {canManageRecords && (
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">Group parents can own regulated children. Systems and vendors stay shared.</Typography>
                                    <Button onClick={() => setShowEntityForm((value) => !value)}>{showEntityForm ? 'Close' : 'Add entity'}</Button>
                                </Stack>
                            )}
                            {canManageRecords && showEntityForm && (
                                <Surface>
                                    <Box component="form" onSubmit={addEntity}>
                                        <Stack spacing={1.5}>
                                            <TextField label="Entity name" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} required />
                                            <TextField select label="Type" value={entityForm.organizationType} onChange={(e) => setEntityForm({ ...entityForm, organizationType: e.target.value })}>
                                                {(catalog?.organizationTypes || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Domicile" value={entityForm.domicileCountryCode} onChange={(e) => setEntityForm({ ...entityForm, domicileCountryCode: e.target.value })}>
                                                {(catalog?.countries || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            {entityForm.domicileCountryCode === 'US' && (
                                                <TextField select label="State of domicile" value={entityForm.domicileSubJurisdiction} onChange={(e) => setEntityForm({ ...entityForm, domicileSubJurisdiction: e.target.value })}>
                                                    {(catalog?.subJurisdictions || []).filter((row: any) => row.country === 'US').map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                                </TextField>
                                            )}
                                            <Typography variant="caption">Lines of business</Typography>
                                            <ChipPicker items={catalog?.linesOfBusiness || []} selected={entityForm.linesOfBusiness} onToggle={(key) => setEntityForm({ ...entityForm, linesOfBusiness: toggle(entityForm.linesOfBusiness, key) })} />
                                            <FormControlLabel control={<Checkbox checked={entityForm.isGroup} onChange={(e) => setEntityForm({ ...entityForm, isGroup: e.target.checked })} />} label="This is a group parent" />
                                            <TextField select label="Parent entity" value={entityForm.parentPublicId} onChange={(e) => setEntityForm({ ...entityForm, parentPublicId: e.target.value })}>
                                                <MenuItem value="">None</MenuItem>
                                                {entities.filter((row) => row.isGroup).map((row) => <MenuItem key={row.publicId} value={row.publicId}>{row.name}</MenuItem>)}
                                            </TextField>
                                            <Button type="submit" variant="contained">Save entity</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            <AppTable
                                rowKey={(row: any) => row.publicId}
                                columns={[
                                    { id: 'name', label: 'Entity', render: (row: any) => row.name },
                                    { id: 'organizationType', label: 'Type', render: (row: any) => row.organizationType.replace(/_/g, ' ') },
                                    { id: 'domicileCountryCode', label: 'Domicile', render: (row: any) => [row.domicileCountryCode, row.domicileSubJurisdiction].filter(Boolean).join(' / ') },
                                    { id: 'group', label: 'Group', render: (row: any) => row.isGroup ? 'Parent' : row.parentEntityId ? 'Child' : 'Standalone' },
                                    { id: 'lines', label: 'Lines', render: (row: any) => (row.linesOfBusiness || []).join(', ') || '—' },
                                    { id: 'licenses', label: 'Licenses', render: (row: any) => String(row.licenseCount ?? 0) },
                                    { id: 'children', label: 'Child entities', render: (row: any) => String(row.childCount ?? 0) },
                                ]}
                                rows={entities}
                                emptyTitle="No insurance entities"
                                emptyBody="Add a Nigerian or U.S. entity after activation. Group parents can own regulated children."
                            />
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/licenses' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="warning">An expired license record is not automatically a legal finding of unlicensed status.</Alert>
                            {canManageRecords && (
                                <Stack direction="row" justifyContent="flex-end">
                                    <Button onClick={() => setShowLicenseForm((value) => !value)}>{showLicenseForm ? 'Close' : 'Add license metadata'}</Button>
                                </Stack>
                            )}
                            {canManageRecords && showLicenseForm && (
                                <Surface>
                                    <Box component="form" onSubmit={addLicense}>
                                        <Stack spacing={1.5}>
                                            <TextField select label="Entity" value={licenseForm.entityPublicId} onChange={(e) => setLicenseForm({ ...licenseForm, entityPublicId: e.target.value })} required>
                                                {entities.map((row) => <MenuItem key={row.publicId} value={row.publicId}>{row.name}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Authority" value={licenseForm.authorityKey} onChange={(e) => setLicenseForm({ ...licenseForm, authorityKey: e.target.value })}>
                                                {(catalog?.authorities || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="License category hook" value={licenseForm.licenseType} onChange={(e) => setLicenseForm({ ...licenseForm, licenseType: e.target.value })} helperText="Country packs define real license categories later. Do not invent licenses.">
                                                {(catalog?.licenseTypeHooks || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <TextField label="Reference / number" value={licenseForm.reference} onChange={(e) => setLicenseForm({ ...licenseForm, reference: e.target.value })} />
                                            <TextField select label="Record status" value={licenseForm.status} onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}>
                                                {['UNKNOWN', 'DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED'].map((status) => <MenuItem key={status} value={status}>{status.replace(/_/g, ' ')}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Verification basis" value={licenseForm.verificationBasis} onChange={(e) => setLicenseForm({ ...licenseForm, verificationBasis: e.target.value })} helperText="Customer-recorded is not registry-verified.">
                                                <MenuItem value="CUSTOMER_RECORDED">Customer recorded</MenuItem>
                                                <MenuItem value="DOCUMENT_VERIFIED">Document verified</MenuItem>
                                                <MenuItem value="EXTERNAL_SOURCE_VERIFIED">External source verified</MenuItem>
                                            </TextField>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                                <TextField fullWidth type="date" label="Effective" InputLabelProps={{ shrink: true }} value={licenseForm.effectiveDate} onChange={(e) => setLicenseForm({ ...licenseForm, effectiveDate: e.target.value })} />
                                                <TextField fullWidth type="date" label="Expiry / renewal" InputLabelProps={{ shrink: true }} value={licenseForm.expiryDate} onChange={(e) => setLicenseForm({ ...licenseForm, expiryDate: e.target.value })} />
                                                <TextField fullWidth type="date" label="Review due" InputLabelProps={{ shrink: true }} value={licenseForm.reviewDueAt} onChange={(e) => setLicenseForm({ ...licenseForm, reviewDueAt: e.target.value })} />
                                            </Stack>
                                            <Button type="submit" variant="contained">Save license metadata</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            <AppTable
                                rowKey={(row: any) => row.publicId}
                                columns={[
                                    { id: 'entity', label: 'Entity', render: (row: any) => row.entity?.name || row.entityId },
                                    { id: 'authorityKey', label: 'Authority', render: (row: any) => row.authorityKey },
                                    { id: 'licenseType', label: 'Category hook', render: (row: any) => row.licenseType },
                                    { id: 'status', label: 'Status', render: (row: any) => row.status },
                                    { id: 'jurisdictionCode', label: 'Jurisdiction', render: (row: any) => row.jurisdictionCode },
                                    { id: 'attention', label: 'Attention', render: (row: any) => (licenseWatch.find((item) => item.publicId === row.publicId)?.attention || 'current').replace(/-/g, ' ') },
                                    { id: 'verification', label: 'Verification', render: (row: any) => (row.verificationBasis || 'CUSTOMER_RECORDED').replace(/_/g, ' ') },
                                ]}
                                rows={licenses}
                                emptyTitle="No license records"
                                emptyBody="Country packs define license categories. Do not invent licenses."
                            />
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/risk' && (
                        <Surface>
                            <Typography sx={{ mb: 1 }}>Insurance risk categories live in Supreme Risk. This is not a second register.</Typography>
                            <Button onClick={() => navigate('/risks/register')}>Open Risk register</Button>
                            <FactList columns={2} items={(risks?.categories || []).slice(0, 8).map((row: any) => ({ label: row.name, value: `${row.riskCount} recorded` }))} />
                        </Surface>
                    )}

                    {TABS[tab]?.path === '/insurance/third-parties' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">Classify an existing Supreme vendor. This does not create a second vendor register.</Alert>
                            <Button onClick={() => navigate('/vendor-management')}>Open Third Parties</Button>
                            {canManageRecords && (
                                <Surface>
                                    <Box component="form" onSubmit={classifyExistingVendor}>
                                        <Stack spacing={1.5}>
                                            <TextField select label="Existing vendor" value={vendorForm.vendorId} onChange={(e) => setVendorForm({ ...vendorForm, vendorId: e.target.value })} required>
                                                {existingVendors.map((row: any) => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Insurance service type" value={vendorForm.serviceCategory} onChange={(e) => setVendorForm({ ...vendorForm, serviceCategory: e.target.value })}>
                                                {(catalog?.vendorServiceCategories || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Jurisdiction" value={vendorForm.jurisdictionCode} onChange={(e) => setVendorForm({ ...vendorForm, jurisdictionCode: e.target.value })}>
                                                {(catalog?.countries || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Entity served" value={vendorForm.entityId} onChange={(e) => setVendorForm({ ...vendorForm, entityId: e.target.value })}>
                                                <MenuItem value="">Shared / group</MenuItem>
                                                {entities.map((row) => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
                                            </TextField>
                                            <Typography variant="caption">Lines of business served</Typography>
                                            <ChipPicker items={catalog?.linesOfBusiness || []} selected={vendorForm.linesOfBusiness} onToggle={(key) => setVendorForm({ ...vendorForm, linesOfBusiness: toggle(vendorForm.linesOfBusiness, key) })} />
                                            <TextField select label="Criticality" value={vendorForm.criticality} onChange={(e) => setVendorForm({ ...vendorForm, criticality: e.target.value })}>
                                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((row) => <MenuItem key={row} value={row}>{row}</MenuItem>)}
                                            </TextField>
                                            <FormControlLabel control={<Checkbox checked={vendorForm.claimsAuthority} onChange={(e) => setVendorForm({ ...vendorForm, claimsAuthority: e.target.checked })} />} label="Claims authority" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.underwritingAuthority} onChange={(e) => setVendorForm({ ...vendorForm, underwritingAuthority: e.target.checked })} />} label="Underwriting authority" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.policyholderInteraction} onChange={(e) => setVendorForm({ ...vendorForm, policyholderInteraction: e.target.checked })} />} label="Policyholder interaction" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.premiumHandling} onChange={(e) => setVendorForm({ ...vendorForm, premiumHandling: e.target.checked })} />} label="Premium / fund handling" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.licenseRequired} onChange={(e) => setVendorForm({ ...vendorForm, licenseRequired: e.target.checked })} />} label="Insurance license required" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.aiModelProvider} onChange={(e) => setVendorForm({ ...vendorForm, aiModelProvider: e.target.checked })} />} label="AI / model provider" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.regulatedOutsourcing} onChange={(e) => setVendorForm({ ...vendorForm, regulatedOutsourcing: e.target.checked })} />} label="Regulated outsourcing" />
                                            <FormControlLabel control={<Checkbox checked={vendorForm.fourthPartyUse} onChange={(e) => setVendorForm({ ...vendorForm, fourthPartyUse: e.target.checked })} />} label="Fourth-party / subcontracting" />
                                            <Button type="submit" variant="contained">Save classification</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            <AppTable
                                rowKey={(row: any) => `${row.vendorId}-${row.serviceCategory}`}
                                columns={[
                                    { id: 'serviceCategory', label: 'Service', render: (row: any) => row.serviceCategory.replace(/_/g, ' ') },
                                    { id: 'jurisdictionCode', label: 'Jurisdiction', render: (row: any) => row.jurisdictionCode || '—' },
                                    { id: 'claimsAuthority', label: 'Claims authority', render: (row: any) => row.claimsAuthority ? 'Yes' : 'No' },
                                    { id: 'criticality', label: 'Criticality', render: (row: any) => row.criticality || '—' },
                                ]}
                                rows={vendors}
                                emptyTitle="No insurance vendor classifications"
                                emptyBody="Classify an existing vendor after activation."
                            />
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/claims' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">{claims?.honesty || 'Claims governance only. Supreme is not a claims-processing system.'}</Alert>
                            {canManageRecords && (
                                <Surface>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>Record delegated claims authority</Typography>
                                    <Box component="form" onSubmit={addAuthority}>
                                        <Stack spacing={1.5}>
                                            <TextField select label="Kind" value={authorityForm.kind} onChange={(e) => setAuthorityForm({ ...authorityForm, kind: e.target.value })}>
                                                {['CLAIMS', 'BINDING', 'UNDERWRITING', 'OTHER'].map((kind) => <MenuItem key={kind} value={kind}>{kind.replace(/_/g, ' ')}</MenuItem>)}
                                            </TextField>
                                            <TextField label="Delegate" value={authorityForm.delegateName} onChange={(e) => setAuthorityForm({ ...authorityForm, delegateName: e.target.value })} required />
                                            <TextField label="Scope" value={authorityForm.scope} onChange={(e) => setAuthorityForm({ ...authorityForm, scope: e.target.value })} />
                                            <TextField label="Limits (as recorded)" value={authorityForm.limits} onChange={(e) => setAuthorityForm({ ...authorityForm, limits: e.target.value })} helperText="Recorded metadata only. Not a legal interpretation." />
                                            <Button type="submit" variant="contained">Save authority metadata</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            <FactList columns={2} items={[
                                { label: 'Entities', value: String(claims?.entities?.length ?? 0) },
                                { label: 'Claims vendors', value: String(claims?.vendors?.length ?? 0) },
                                { label: 'Delegated authority records', value: String(claims?.delegatedAuthority?.length ?? 0) },
                                { label: 'Claims-influencing models', value: String(claims?.models?.length ?? 0) },
                            ]} />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                                <Button onClick={() => navigate('/vendor-management')}>Open vendors</Button>
                                <Button onClick={() => navigate('/risks/register')}>Open risks</Button>
                                <Button onClick={() => navigate('/findings')}>Open findings</Button>
                                <Button onClick={() => navigate('/ai-governance/systems')}>Open models</Button>
                                <Button onClick={() => navigate('/compliance')}>Open controls</Button>
                            </Stack>
                            <AppTable
                                rowKey={(row: any) => row.id}
                                columns={[
                                    { id: 'serviceCategory', label: 'Claims vendor type', render: (row: any) => row.serviceCategory.replace(/_/g, ' ') },
                                    { id: 'claimsAuthority', label: 'Authority recorded', render: (row: any) => row.claimsAuthority ? 'Yes' : 'No' },
                                    { id: 'criticality', label: 'Criticality', render: (row: any) => row.criticality || '—' },
                                ]}
                                rows={claims?.vendors || []}
                                emptyTitle="No classified claims vendors"
                                emptyBody="Classify TPAs, adjusters, or claims administrators on existing vendor records."
                            />
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/underwriting' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">{underwriting?.honesty || 'Underwriting and pricing governance only. Not a quoting or rating engine.'}</Alert>
                            <FactList columns={2} items={[
                                { label: 'Entities', value: String(underwriting?.entities?.length ?? 0) },
                                { label: 'UW / data vendors', value: String(underwriting?.vendors?.length ?? 0) },
                                { label: 'Delegated UW/binding', value: String(underwriting?.delegatedAuthority?.length ?? 0) },
                                { label: 'Influencing models', value: String(underwriting?.models?.length ?? 0) },
                            ]} />
                            <Button onClick={() => navigate('/ai-governance/systems')}>Open AI systems</Button>
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/reinsurance' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">{reinsurance?.honesty || 'Counterparty governance metadata. Not placement, ceding, or treaty administration.'}</Alert>
                            {canManageRecords && (
                                <Surface>
                                    <Box component="form" onSubmit={addCounterparty}>
                                        <Stack spacing={1.5}>
                                            <TextField label="Reinsurer / counterparty" value={counterpartyForm.name} onChange={(e) => setCounterpartyForm({ ...counterpartyForm, name: e.target.value })} required />
                                            <TextField select label="Relationship type" value={counterpartyForm.relationshipType} onChange={(e) => setCounterpartyForm({ ...counterpartyForm, relationshipType: e.target.value })}>
                                                {['TREATY', 'FACULTATIVE', 'RETRO', 'OTHER'].map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Jurisdiction" value={counterpartyForm.jurisdictionCode} onChange={(e) => setCounterpartyForm({ ...counterpartyForm, jurisdictionCode: e.target.value })}>
                                                {(catalog?.countries || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <Button type="submit" variant="contained">Save relationship</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            <AppTable
                                rowKey={(row: any) => row.publicId}
                                columns={[
                                    { id: 'name', label: 'Counterparty', render: (row: any) => row.name },
                                    { id: 'relationshipType', label: 'Type', render: (row: any) => row.relationshipType },
                                    { id: 'jurisdictionCode', label: 'Jurisdiction', render: (row: any) => row.jurisdictionCode || '—' },
                                    { id: 'criticality', label: 'Criticality', render: (row: any) => row.criticality || '—' },
                                ]}
                                rows={reinsurance?.counterparties || []}
                                emptyTitle="No reinsurance relationships"
                                emptyBody="Record treaty or facultative metadata. Supreme does not place reinsurance."
                            />
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/controls' && (
                        <Surface>
                            <Typography sx={{ mb: 1 }}>Insurance controls extend Shared Controls. Evidence stays in the shared repository.</Typography>
                            <Button onClick={() => navigate('/compliance')}>Open Controls & compliance</Button>
                            <FactList columns={1} items={(catalog?.controlExtensions || []).map((row: any) => ({ label: row.controlKey, value: row.title }))} />
                        </Surface>
                    )}

                    {TABS[tab]?.path === '/insurance/ai' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">Insurance context attaches to existing AI Governance records. This is not another inventory.</Alert>
                            <Button onClick={() => navigate('/ai-governance/systems')}>Open AI systems</Button>
                            {canManageRecords && (
                                <Surface>
                                    <Box component="form" onSubmit={saveAiContext}>
                                        <Stack spacing={1.5}>
                                            <TextField select label="Existing AI system" value={aiForm.aiSystemId} onChange={(e) => setAiForm({ ...aiForm, aiSystemId: e.target.value })} required>
                                                {(Array.isArray(aiSystems) ? aiSystems : []).map((row: any) => <MenuItem key={row.id || row.publicId} value={row.id}>{row.name}</MenuItem>)}
                                            </TextField>
                                            <TextField label="Insurance use case" value={aiForm.insuranceUseCase} onChange={(e) => setAiForm({ ...aiForm, insuranceUseCase: e.target.value })} />
                                            <TextField select label="Line of business" value={aiForm.lineOfBusiness} onChange={(e) => setAiForm({ ...aiForm, lineOfBusiness: e.target.value })}>
                                                {(catalog?.linesOfBusiness || []).map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Entity" value={aiForm.entityId} onChange={(e) => setAiForm({ ...aiForm, entityId: e.target.value })}>
                                                <MenuItem value="">Shared / group</MenuItem>
                                                {entities.map((row) => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
                                            </TextField>
                                            <TextField label="Third-party provider" value={aiForm.thirdPartyProvider} onChange={(e) => setAiForm({ ...aiForm, thirdPartyProvider: e.target.value })} />
                                            <TextField label="Validation status" value={aiForm.validationStatus} onChange={(e) => setAiForm({ ...aiForm, validationStatus: e.target.value })} />
                                            <TextField label="Bias / fairness review" value={aiForm.biasReviewStatus} onChange={(e) => setAiForm({ ...aiForm, biasReviewStatus: e.target.value })} />
                                            <TextField label="Explainability" value={aiForm.explainability} onChange={(e) => setAiForm({ ...aiForm, explainability: e.target.value })} />
                                            <FormControlLabel control={<Checkbox checked={aiForm.underwritingInfluence} onChange={(e) => setAiForm({ ...aiForm, underwritingInfluence: e.target.checked })} />} label="Underwriting influence" />
                                            <FormControlLabel control={<Checkbox checked={aiForm.pricingInfluence} onChange={(e) => setAiForm({ ...aiForm, pricingInfluence: e.target.checked })} />} label="Pricing influence" />
                                            <FormControlLabel control={<Checkbox checked={aiForm.claimsInfluence} onChange={(e) => setAiForm({ ...aiForm, claimsInfluence: e.target.checked })} />} label="Claims influence" />
                                            <FormControlLabel control={<Checkbox checked={aiForm.fraudInfluence} onChange={(e) => setAiForm({ ...aiForm, fraudInfluence: e.target.checked })} />} label="Fraud influence" />
                                            <FormControlLabel control={<Checkbox checked={aiForm.consumerImpact} onChange={(e) => setAiForm({ ...aiForm, consumerImpact: e.target.checked })} />} label="Customer impact" />
                                            <FormControlLabel control={<Checkbox checked={aiForm.externalData} onChange={(e) => setAiForm({ ...aiForm, externalData: e.target.checked })} />} label="External data" />
                                            <TextField label="Human oversight" value={aiForm.humanOversight} onChange={(e) => setAiForm({ ...aiForm, humanOversight: e.target.value })} />
                                            <TextField type="date" label="Next review" InputLabelProps={{ shrink: true }} value={aiForm.nextReviewAt} onChange={(e) => setAiForm({ ...aiForm, nextReviewAt: e.target.value })} />
                                            <Button type="submit" variant="contained">Save insurance AI context</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            <AppTable
                                rowKey={(row: any) => row.aiSystemId}
                                columns={[
                                    { id: 'insuranceUseCase', label: 'Use case', render: (row: any) => row.insuranceUseCase || '—' },
                                    { id: 'lineOfBusiness', label: 'LOB', render: (row: any) => row.lineOfBusiness || '—' },
                                    { id: 'claimsInfluence', label: 'Claims', render: (row: any) => row.claimsInfluence ? 'Yes' : 'No' },
                                    { id: 'humanOversight', label: 'Oversight', render: (row: any) => row.humanOversight || '—' },
                                ]}
                                rows={aiContexts}
                                emptyTitle="No insurance AI context"
                                emptyBody="Attach context to an existing AI system record."
                            />
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/regulatory' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">{regulatory?.honesty || 'Recommended is not applicable. Applicable is a human decision.'}</Alert>
                            {regulatory?.dataCategories && (
                                <Typography variant="body2">Insurance data categories for Privacy context: {regulatory.dataCategories.join(', ')}. These stay in the existing Privacy module.</Typography>
                            )}
                            {(regulatory?.assessmentPlan || []).length > 0 && (
                                <Surface>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>Assessment plan (from control/evidence map)</Typography>
                                    <AppTable
                                        rowKey={(row: any) => row.id}
                                        columns={[
                                            { id: 'id', label: 'ID', render: (row: any) => row.id },
                                            { id: 'question', label: 'Question', render: (row: any) => row.question },
                                            { id: 'relatedControls', label: 'Control', render: (row: any) => (row.relatedControls || []).join(', ') },
                                            { id: 'evidenceExpected', label: 'Evidence', render: (row: any) => (row.evidenceExpected || []).join(', ') },
                                        ]}
                                        rows={regulatory.assessmentPlan}
                                        emptyTitle="No generated questions"
                                        emptyBody="Questions are generated from enabled packs and organization type."
                                    />
                                </Surface>
                            )}
                            {canManageRecords && (
                                <Surface>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>Applicability review</Typography>
                                    <Box component="form" onSubmit={reviewPack}>
                                        <Stack spacing={1.5}>
                                            <TextField select label="Pack" value={applicabilityForm.packKey} onChange={(e) => setApplicabilityForm({ ...applicabilityForm, packKey: e.target.value })} required>
                                                {(regulatory?.packs || []).map((pack: any) => <MenuItem key={pack.key} value={pack.key}>{pack.label}</MenuItem>)}
                                            </TextField>
                                            <TextField select label="Decision" value={applicabilityForm.state} onChange={(e) => setApplicabilityForm({ ...applicabilityForm, state: e.target.value })}>
                                                <MenuItem value="APPLICABLE">Applicable</MenuItem>
                                                <MenuItem value="NOT_APPLICABLE">Not applicable</MenuItem>
                                                <MenuItem value="NEEDS_REVIEW">Needs legal/compliance review</MenuItem>
                                                <MenuItem value="ENABLED">Enabled</MenuItem>
                                                <MenuItem value="DISABLED">Disabled</MenuItem>
                                            </TextField>
                                            <TextField label="Reason" value={applicabilityForm.reason} onChange={(e) => setApplicabilityForm({ ...applicabilityForm, reason: e.target.value })} helperText="Required when marking not applicable." />
                                            <Button type="submit" variant="contained">Record decision</Button>
                                        </Stack>
                                    </Box>
                                </Surface>
                            )}
                            {(regulatory?.packs || []).map((pack: any) => (
                                <Surface key={pack.key}>
                                    <Typography fontWeight={700}>{pack.label}</Typography>
                                    <FactList columns={2} items={[
                                        { label: 'Jurisdiction', value: pack.jurisdiction },
                                        { label: 'Regulator', value: pack.regulator },
                                        { label: 'Version', value: pack.version },
                                        { label: 'Effective', value: pack.effectiveDate || '—' },
                                        { label: 'Applicability', value: String(pack.applicabilityState || 'AVAILABLE').replace(/_/g, ' ') },
                                        { label: 'Why recommended', value: pack.whyRecommended || pack.honesty },
                                        { label: 'Mapped controls', value: (pack.mappedControls || []).join(', ') || '—' },
                                        { label: 'Evidence categories', value: (pack.evidenceCategories || []).join(', ') || '—' },
                                    ]} />
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>Source: {pack.sourceUrl}</Typography>
                                    {(pack.requirements || []).slice(0, 4).map((req: any) => (
                                        <Typography key={req.id} variant="body2" sx={{ mt: 1 }}>{req.id} · {req.kind.replace(/_/g, ' ')} · {req.sourceReference}</Typography>
                                    ))}
                                </Surface>
                            ))}
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/reports' && (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Alert severity="info">{reports?.honesty || 'Live tenant records only. No fabricated compliance percentage.'}</Alert>
                            {(reports?.reports || []).map((report: any) => (
                                <Surface key={report.key}>
                                    <Typography fontWeight={700}>{report.title}</Typography>
                                    <Typography variant="body2">Built from recorded tenant data. Not a certification score.</Typography>
                                </Surface>
                            ))}
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/configuration' && (
                        <Surface>
                            <Typography sx={{ mb: 1 }}>Configuration is versioned. Prior versions stay SUPERSEDED.</Typography>
                            <AppTable
                                rowKey={(row: any) => String(row.version)}
                                columns={[
                                    { id: 'version', label: 'Version', render: (row: any) => row.version },
                                    { id: 'status', label: 'Status', render: (row: any) => row.status },
                                    { id: 'organizationType', label: 'Type', render: (row: any) => row.organizationType },
                                    { id: 'effectiveFrom', label: 'Effective', render: (row: any) => row.effectiveFrom ? new Date(row.effectiveFrom).toLocaleDateString() : '—' },
                                ]}
                                rows={overview?.history || []}
                                emptyTitle="No configuration history"
                                emptyBody="Activate Insurance Edition to create version 1."
                            />
                            {canConfigure && <Button sx={{ mt: 2 }} onClick={() => navigate('/insurance/activate')}>Change configuration</Button>}
                        </Surface>
                    )}
                </Stack>
            </QueryState>
            </Box>
        </WorkspaceFrame>
    );
}
