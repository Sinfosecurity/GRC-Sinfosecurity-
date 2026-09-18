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
import { insuranceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canSeeNav } from '../security/navAccess';

const TABS = [
    { label: 'Overview', path: '/insurance' },
    { label: 'Entities', path: '/insurance/entities' },
    { label: 'Licenses', path: '/insurance/licenses' },
    { label: 'Risk', path: '/insurance/risk' },
    { label: 'Third Parties', path: '/insurance/third-parties' },
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
    const [showEntityForm, setShowEntityForm] = useState(false);
    const [showLicenseForm, setShowLicenseForm] = useState(false);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<any>({
        organizationType: 'INSURER',
        domicileCountryCode: 'NG',
        domicileSubJurisdiction: '',
        operatingJurisdictions: ['NG', 'US'],
        linesOfBusiness: ['MOTOR', 'PROPERTY'],
        activities: ['CLAIMS', 'UNDERWRITING'],
        dataHandled: ['POLICYHOLDER'],
        aiUsage: [] as string[],
        thirdPartyEcosystem: ['TPA'],
        enabledPacks: [] as string[],
        recommendationDecisions: {} as Record<string, string>,
    });
    const [entityForm, setEntityForm] = useState({ name: '', organizationType: 'INSURER', domicileCountryCode: 'NG', domicileSubJurisdiction: '', linesOfBusiness: ['MOTOR'] as string[], isGroup: false, parentPublicId: '' });
    const [licenseForm, setLicenseForm] = useState({ entityPublicId: '', authorityKey: 'NAICOM', jurisdictionCode: 'NG', licenseType: 'NG_INSURER', reference: '', status: 'UNKNOWN', effectiveDate: '', expiryDate: '' });

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [over, cat, ents, lics, risk, links, classified] = await Promise.all([
                insuranceAPI.overview(),
                insuranceAPI.catalog(),
                insuranceAPI.entities().catch(() => ({ data: { data: [] } })),
                insuranceAPI.licenses().catch(() => ({ data: { data: [] } })),
                insuranceAPI.risks().catch(() => ({ data: { data: null } })),
                insuranceAPI.graph().catch(() => ({ data: { data: [] } })),
                insuranceAPI.vendors().catch(() => ({ data: { data: [] } })),
            ]);
            setOverview(over.data.data);
            setCatalog(cat.data.data);
            setEntities(ents.data.data || []);
            setLicenses(lics.data.data || []);
            setRisks(risk.data.data);
            setGraph(links.data.data || []);
            setVendors(classified.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load Insurance Edition');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const recommended = useMemo(() => {
        if (!catalog) return [];
        const hay = new Set([draft.organizationType, ...draft.operatingJurisdictions, ...draft.activities, ...draft.dataHandled, draft.domicileCountryCode, '*']);
        return (catalog.packs || []).filter((pack: any) => (pack.recommendationTriggers || []).some((key: string) => hay.has(key)));
    }, [catalog, draft]);

    const activate = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
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
                                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Twelve steps. Pack recommendations follow your answers. They are not legal requirements.</Typography>
                                    <WorkflowStepper steps={WIZARD} active={step} compact />
                                    <Box component="form" onSubmit={activate} sx={{ mt: 2 }}>
                                        {step === 0 && (
                                            <TextField select fullWidth label="Organization type" value={draft.organizationType} onChange={(e) => setDraft({ ...draft, organizationType: e.target.value })}>
                                                {typesForDraft.map((row: any) => <MenuItem key={row.key} value={row.key}>{row.label}</MenuItem>)}
                                            </TextField>
                                        )}
                                        {step === 1 && (
                                            <Stack spacing={2}>
                                                <TextField select fullWidth label="Domicile" value={draft.domicileCountryCode} onChange={(e) => setDraft({ ...draft, domicileCountryCode: e.target.value, domicileSubJurisdiction: '' })}>
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
                                    {(overview.attention || []).map((item: any) => (
                                        <Alert key={`${item.type}-${item.publicId}`} severity="warning" action={<Button onClick={() => navigate(item.href)}>Open</Button>}>{item.why}</Alert>
                                    ))}
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
                                                {['UNKNOWN', 'DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                                            </TextField>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                                <TextField fullWidth type="date" label="Effective" InputLabelProps={{ shrink: true }} value={licenseForm.effectiveDate} onChange={(e) => setLicenseForm({ ...licenseForm, effectiveDate: e.target.value })} />
                                                <TextField fullWidth type="date" label="Expiry / renewal" InputLabelProps={{ shrink: true }} value={licenseForm.expiryDate} onChange={(e) => setLicenseForm({ ...licenseForm, expiryDate: e.target.value })} />
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
                        <Surface>
                            <Typography sx={{ mb: 1 }}>Classify existing vendors. Do not duplicate vendor records.</Typography>
                            <Button onClick={() => navigate('/vendor-management')}>Open Third Parties</Button>
                            <FactList columns={2} items={vendors.slice(0, 8).map((row: any) => ({ label: row.serviceCategory.replace(/_/g, ' '), value: row.vendorId }))} />
                        </Surface>
                    )}

                    {TABS[tab]?.path === '/insurance/controls' && (
                        <Surface>
                            <Typography sx={{ mb: 1 }}>Insurance controls extend Shared Controls. Evidence stays in the shared repository.</Typography>
                            <Button onClick={() => navigate('/compliance')}>Open Controls & compliance</Button>
                            <FactList columns={1} items={(catalog?.controlExtensions || []).map((row: any) => ({ label: row.controlKey, value: row.title }))} />
                        </Surface>
                    )}

                    {TABS[tab]?.path === '/insurance/ai' && (
                        <Surface>
                            <Typography sx={{ mb: 1 }}>Insurance model metadata attaches to existing AI system records.</Typography>
                            <Button onClick={() => navigate('/ai-governance/systems')}>Open AI systems</Button>
                        </Surface>
                    )}

                    {TABS[tab]?.path === '/insurance/regulatory' && (
                        <Stack spacing={1}>
                            <Alert severity="info">Available packs are metadata only. No fabricated regulatory requirements.</Alert>
                            {(catalog?.packs || []).map((pack: any) => (
                                <Surface key={pack.key}>
                                    <Typography fontWeight={700}>{pack.label}</Typography>
                                    <Typography variant="body2">{pack.honesty}</Typography>
                                </Surface>
                            ))}
                        </Stack>
                    )}

                    {TABS[tab]?.path === '/insurance/reports' && (
                        <Surface>
                            <Typography>Phase A does not invent insurance compliance scores. Use existing Supreme reports for live tenant data.</Typography>
                        </Surface>
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
