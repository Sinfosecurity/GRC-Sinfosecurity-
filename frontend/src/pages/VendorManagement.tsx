import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Drawer,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    Alert,
    Snackbar,
    Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import MetricCard from '../components/design/MetricCard';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import { aiGovernanceAPI, tprmAPI, vendorAPI } from '../services/api';
import EntityRelationships from '../components/EntityRelationships';
import { humanizeLabel } from '../utils/humanizeLabel';

interface Vendor {
    id: string | number;
    publicId?: string;
    name: string;
    category: string;
    tier: 'Critical' | 'High' | 'Medium' | 'Low';
    status: string;
    riskScore: number | null;
    residualRiskScore?: number | null;
    inherentRiskScore?: number | null;
    complianceScore: number | null;
    lastAssessment: string;
    nextReview: string;
    contactEmail: string;
    dataAccess: string;
    assessmentStatus: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue';
}

const vendorTypes = [
    { value: 'SAAS', label: 'SaaS' },
    { value: 'CLOUD_SERVICE', label: 'Cloud service' },
    { value: 'IT_SERVICE', label: 'IT service' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Professional services' },
    { value: 'CONSULTING', label: 'Consulting' },
    { value: 'OTHER', label: 'Other' },
];
const categories = [
    { value: 'CLOUD_HOSTING', label: 'Cloud hosting' },
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'PAYMENT_PROCESSING', label: 'Payment processing' },
    { value: 'ANALYTICS', label: 'Analytics' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'HR_PAYROLL', label: 'HR / payroll' },
    { value: 'CYBERSECURITY', label: 'Cybersecurity' },
    { value: 'OTHER', label: 'Other' },
];
const tiers = [
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
];

function displayAssessmentStatus(status?: string) {
    switch (status) {
        case 'COMPLETED':
        case 'Completed':
            return 'Completed';
        case 'IN_PROGRESS':
        case 'PENDING_REVIEW':
        case 'PENDING_APPROVAL':
        case 'In Progress':
            return 'In Progress';
        case 'OVERDUE':
        case 'Overdue':
            return 'Overdue';
        default:
            return 'Not Started';
    }
}

function displayTier(tier?: string) {
    if (!tier) return 'Medium';
    return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export default function VendorManagement() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [tabValue, setTabValue] = useState(0);
    const [detailTab, setDetailTab] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [offboardVendor, setOffboardVendor] = useState<Vendor | null>(null);
    const [offboardNotes, setOffboardNotes] = useState('');
    const [offboardAck, setOffboardAck] = useState(false);
    const [offboardPreview, setOffboardPreview] = useState<any>(null);
    const [riskExplanation, setRiskExplanation] = useState<{
        methodologyVersion?: string;
        latest?: {
            inherentRisk?: number;
            controlEffectiveness?: number;
            residualRisk?: number;
            riskBand?: string;
            factors?: Array<{ label: string; points: number; rationale?: string }>;
        } | null;
    } | null>(null);
    const [riskExplanationError, setRiskExplanationError] = useState<string | null>(null);
    const [aiLinks, setAiLinks] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [newVendor, setNewVendor] = useState({
        name: '',
        vendorType: 'SAAS',
        category: '',
        tier: 'MEDIUM',
        contactEmail: '',
        primaryContact: '',
        servicesProvided: '',
        dataAccess: '',
        website: '',
        businessOwner: '',
    });

    useEffect(() => {
        loadVendors();
        loadStatistics();
    }, []);

    const loadVendors = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await vendorAPI.getAll({ pageSize: 100 });
            if (response.data.vendors) {
                const mappedVendors = response.data.vendors.map((v: any) => ({
                    id: v.id,
                    publicId: v.publicId,
                    name: v.name,
                    category: v.category,
                    tier: displayTier(v.tier) as Vendor['tier'],
                    status: v.status,
                    riskScore: v.residualRiskScore ?? null,
                    residualRiskScore: v.residualRiskScore ?? null,
                    inherentRiskScore: v.inherentRiskScore ?? null,
                    complianceScore: v.residualRiskScore != null ? 100 - v.residualRiskScore : null,
                    lastAssessment: v.lastAssessmentDate ? new Date(v.lastAssessmentDate).toISOString().split('T')[0] : 'N/A',
                    nextReview: v.nextReviewDate ? new Date(v.nextReviewDate).toISOString().split('T')[0] : 'N/A',
                    contactEmail: v.contactEmail || v.primaryContact || 'N/A',
                    dataAccess: (v.dataTypesAccessed || v.dataCategories || []).join(', ') || 'N/A',
                    assessmentStatus: displayAssessmentStatus(v.assessmentStatus),
                }));
                setVendors(mappedVendors);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load vendors.');
            setVendors([]);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const response = await vendorAPI.getStatistics();
            setStatistics(response.data);
        } catch {
            // Metrics stay blank rather than inventing values.
        }
    };

    const criticalVendors = statistics?.summary?.criticalVendors
        ?? statistics?.tierCounts?.CRITICAL
        ?? statistics?.tierCounts?.Critical
        ?? vendors.filter((v) => v.tier === 'Critical').length;
    const overdueAssessments = vendors.filter((v) => v.assessmentStatus === 'Overdue').length;
    const highVendors = vendors.filter((v) => v.tier === 'Critical' || v.tier === 'High').length;

    const handleAddVendor = async () => {
        const missing = [
            !newVendor.name && 'Vendor name',
            !newVendor.vendorType && 'Vendor type',
            !newVendor.category && 'Category',
            !newVendor.primaryContact && 'Primary contact',
            !newVendor.contactEmail && 'Contact email',
            !newVendor.servicesProvided && 'Services provided',
        ].filter(Boolean);
        if (missing.length) {
            setSnackbar({ open: true, message: `Required: ${missing.join(', ')}`, severity: 'error' });
            return;
        }
        try {
            setSaving(true);
            const website = newVendor.website
                ? (newVendor.website.startsWith('http') ? newVendor.website : `https://${newVendor.website}`)
                : '';
            await vendorAPI.create({
                name: newVendor.name.trim(),
                vendorType: newVendor.vendorType,
                category: newVendor.category,
                tier: newVendor.tier,
                primaryContact: newVendor.primaryContact.trim(),
                contactEmail: newVendor.contactEmail.trim(),
                servicesProvided: newVendor.servicesProvided.trim(),
                website,
                businessOwner: newVendor.businessOwner || undefined,
                dataTypesAccessed: newVendor.dataAccess ? [newVendor.dataAccess] : [],
                geographicFootprint: [],
                regulatoryScope: [],
            });
            setSnackbar({ open: true, message: 'Vendor added. The list has been refreshed.', severity: 'success' });
            setOpenDialog(false);
            setNewVendor({
                name: '',
                vendorType: 'SAAS',
                category: '',
                tier: 'MEDIUM',
                contactEmail: '',
                primaryContact: '',
                servicesProvided: '',
                dataAccess: '',
                website: '',
                businessOwner: '',
            });
            await loadVendors();
            await loadStatistics();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to add vendor', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleViewVendor = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setDetailTab(0);
        setRiskExplanation(null);
        setRiskExplanationError(null);
        setAiLinks(null);
        tprmAPI.riskExplanation(String(vendor.id))
            .then((response) => setRiskExplanation(response.data.data))
            .catch((err: any) => setRiskExplanationError(err.message || 'Unable to load risk explanation'));
        aiGovernanceAPI.vendorLinks(String(vendor.id))
            .then((response) => setAiLinks(response.data.data))
            .catch(() => setAiLinks({ systems: [], providers: [] }));
    };

    const handleStartAssessment = (vendor?: Vendor | null) => {
        const target = vendor || selectedVendor;
        if (target?.id) {
            navigate(`/assessments?vendorId=${target.id}`);
            return;
        }
        navigate('/assessments');
    };

    const filtered = vendors.filter((vendor) => {
        if (tabValue === 1) return vendor.tier === 'Critical' || vendor.tier === 'High';
        if (tabValue === 2) return vendor.assessmentStatus !== 'Completed';
        return true;
    });

    return (
        <Box>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <PageHeader
                title="Third Parties"
                description="Search, filter, and open a vendor record. Residual risk and reviews come from persisted tenant data only."
                actions={
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => navigate('/vendor-onboarding')}>Onboard Third Party</Button>
                        <Button variant="contained" onClick={() => setOpenDialog(true)} disabled={saving}>Add existing record</Button>
                    </Stack>
                }
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <MetricCard label="Total" value={vendors.length} />
                <MetricCard label="Critical" value={criticalVendors} />
                <MetricCard label="High risk" value={highVendors} />
                <MetricCard label="Due for review" value={overdueAssessments} />
            </Stack>

            <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 2 }}>
                <Tab label="All" />
                <Tab label="Critical & high" />
                <Tab label="Assessments pending" />
            </Tabs>

            <QueryState
                loading={loading && vendors.length === 0}
                error={error}
                empty={!loading && vendors.length === 0}
                emptyTitle="No vendors yet"
                emptyBody="Add a vendor with type, category, contact, and services. The new record appears in this list immediately."
                emptyAction={<Button variant="contained" onClick={() => setOpenDialog(true)}>Add vendor</Button>}
            >
                <AppTable
                    rows={filtered}
                    rowKey={(row) => String(row.id)}
                    onRowClick={handleViewVendor}
                    searchPlaceholder="Search vendors"
                    searchValue={(row) => `${row.name} ${row.category} ${row.tier} ${row.contactEmail} ${row.status}`}
                    emptyTitle="No vendors match this view"
                    emptyBody="Change the filter or search to see other vendors."
                    columns={[
                        { id: 'name', label: 'Vendor', sortValue: (row) => row.name, render: (row) => (
                            <Box>
                                <Typography variant="subtitle2">{row.name}</Typography>
                                <Typography variant="caption">{row.publicId || row.contactEmail}</Typography>
                            </Box>
                        ) },
                        { id: 'category', label: 'Category', hideOnMobile: true, sortValue: (row) => row.category, render: (row) => (categories.find((item) => item.value === row.category)?.label || row.category.replace(/_/g, ' ').toLowerCase()) },
                        { id: 'tier', label: 'Tier', sortValue: (row) => row.tier, render: (row) => <StatusBadge value={row.tier} kind="severity" /> },
                        { id: 'inherent', label: 'Inherent risk', hideOnMobile: true, sortValue: (row) => row.inherentRiskScore ?? -1, render: (row) => row.inherentRiskScore != null ? `${row.inherentRiskScore}` : 'Not scored' },
                        { id: 'risk', label: 'Residual risk', hideOnMobile: true, sortValue: (row) => row.residualRiskScore ?? -1, render: (row) => row.residualRiskScore != null ? `${row.residualRiskScore}` : 'Not scored' },
                        { id: 'assessment', label: 'Assessment', sortValue: (row) => row.assessmentStatus, render: (row) => (
                            <StatusBadge kind="plain" tone={row.assessmentStatus === 'Overdue' ? 'critical' : row.assessmentStatus === 'Completed' ? 'success' : 'high'} label={row.assessmentStatus} />
                        ) },
                        { id: 'review', label: 'Next review', hideOnMobile: true, sortValue: (row) => row.nextReview, render: (row) => row.nextReview },
                        { id: 'action', label: '', render: (row) => (
                            <Button size="small" onClick={(event) => { event.stopPropagation(); handleStartAssessment(row); }}>
                                Assess
                            </Button>
                        ) },
                    ]}
                />
            </QueryState>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add vendor</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Vendor name" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} required />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel id="vendor-type-label">Vendor type</InputLabel>
                                <Select labelId="vendor-type-label" inputProps={{ 'aria-label': 'Vendor type' }} value={newVendor.vendorType} onChange={(e) => setNewVendor({ ...newVendor, vendorType: e.target.value })} label="Vendor type">
                                    {vendorTypes.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel id="vendor-category-label">Category</InputLabel>
                                <Select labelId="vendor-category-label" inputProps={{ 'aria-label': 'Category' }} value={newVendor.category} onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })} label="Category">
                                    {categories.map((cat) => <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Risk tier</InputLabel>
                                <Select value={newVendor.tier} onChange={(e) => setNewVendor({ ...newVendor, tier: e.target.value })} label="Risk tier">
                                    {tiers.map((tier) => <MenuItem key={tier.value} value={tier.value}>{tier.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Primary contact" value={newVendor.primaryContact} onChange={(e) => setNewVendor({ ...newVendor, primaryContact: e.target.value })} required />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Contact email" type="email" value={newVendor.contactEmail} onChange={(e) => setNewVendor({ ...newVendor, contactEmail: e.target.value })} required />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Website" value={newVendor.website} onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Business owner" value={newVendor.businessOwner} onChange={(e) => setNewVendor({ ...newVendor, businessOwner: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Services provided" value={newVendor.servicesProvided} onChange={(e) => setNewVendor({ ...newVendor, servicesProvided: e.target.value })} required />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Data access" value={newVendor.dataAccess} onChange={(e) => setNewVendor({ ...newVendor, dataAccess: e.target.value })} helperText="Example: Customer PII, payment data" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddVendor}
                        variant="contained"
                        disabled={saving || !newVendor.name || !newVendor.vendorType || !newVendor.category || !newVendor.primaryContact || !newVendor.contactEmail || !newVendor.servicesProvided}
                    >
                        Add vendor
                    </Button>
                </DialogActions>
            </Dialog>

            <Drawer anchor="right" open={Boolean(selectedVendor)} onClose={() => setSelectedVendor(null)} PaperProps={{ sx: { width: { xs: '100%', md: 560 } } }}>
                {selectedVendor && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="overline">Vendor</Typography>
                        <Typography variant="h3" sx={{ mb: 1 }}>{selectedVendor.name}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <StatusBadge value={selectedVendor.tier} kind="severity" />
                            <StatusBadge kind="plain" label={humanizeLabel(selectedVendor.status)} />
                            <StatusBadge kind="plain" tone={selectedVendor.assessmentStatus === 'Overdue' ? 'critical' : 'info'} label={selectedVendor.assessmentStatus} />
                        </Stack>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Next action: {selectedVendor.assessmentStatus === 'Completed' ? 'Open a decision brief or review findings.' : 'Start or continue the assessment.'}
                        </Typography>
                        <Tabs value={detailTab} onChange={(_, value) => setDetailTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
                            {['Overview', 'Risk', 'Assessments', 'Evidence', 'Findings', 'Monitoring', 'Decisions', 'Activity'].map((label) => (
                                <Tab key={label} label={label} />
                            ))}
                        </Tabs>

                        {detailTab === 0 && (
                            <Stack spacing={1.5}>
                                <Surface>
                                    <Typography variant="caption">Category</Typography>
                                    <Typography>{categories.find((item) => item.value === selectedVendor.category)?.label || selectedVendor.category.replace(/_/g, ' ')}</Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Contact</Typography>
                                    <Typography>{selectedVendor.contactEmail}</Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Data access</Typography>
                                    <Typography>{selectedVendor.dataAccess}</Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Next review</Typography>
                                    <Typography>{selectedVendor.nextReview}</Typography>
                                </Surface>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button variant="contained" onClick={() => handleStartAssessment()}>Start assessment</Button>
                                    <Button onClick={() => navigate(`/privacy-ops/vendors/${selectedVendor.id}`)}>Open privacy</Button>
                                    <Button onClick={() => navigate((aiLinks?.systems || [])[0] ? `/ai-governance/systems/${aiLinks.systems[0].publicId}` : '/ai-governance')}>Open AI governance</Button>
                                    <Button onClick={() => navigate(`/documents?vendorId=${selectedVendor.id}`)}>Request evidence</Button>
                                    <Button onClick={() => navigate(`/findings?vendorId=${selectedVendor.id}`)}>Create finding</Button>
                                    <Button onClick={() => navigate(`/decision-briefs?vendorId=${selectedVendor.id}`)}>Make decision</Button>
                                </Stack>
                                {(aiLinks?.systems || []).length > 0 && (
                                    <Surface>
                                        <Typography variant="h6" sx={{ mb: 1 }}>AI governance</Typography>
                                        <Typography>{aiLinks.systems.map((row: any) => `${row.publicId} ${row.name}`).join(', ')}</Typography>
                                        <Button sx={{ mt: 1 }} onClick={() => navigate(`/ai-governance/systems/${aiLinks.systems[0].publicId}`)}>Open linked AI system</Button>
                                    </Surface>
                                )}
                                <EntityRelationships sourceModel="Vendor" sourceId={String(selectedVendor.id)} />
                            </Stack>
                        )}
                        {detailTab === 1 && (
                            <Stack spacing={1.5}>
                                <MetricCard label="Residual risk" value={selectedVendor.residualRiskScore != null ? `${selectedVendor.residualRiskScore}` : 'Not scored'} />
                                {selectedVendor.inherentRiskScore != null && (
                                    <Typography variant="body2">Inherent risk {selectedVendor.inherentRiskScore} is intake exposure, not the register posture.</Typography>
                                )}
                                {riskExplanationError && <Alert severity="error">{riskExplanationError}</Alert>}
                                {!riskExplanationError && !riskExplanation && <Typography variant="body2">Loading risk explanation…</Typography>}
                                {riskExplanation?.latest ? (
                                    <Surface>
                                        <Typography variant="h5" sx={{ mb: 1 }}>Explainable residual risk</Typography>
                                        <Typography variant="body2">Inherent {riskExplanation.latest.inherentRisk}</Typography>
                                        <Typography variant="body2">Control effectiveness {riskExplanation.latest.controlEffectiveness}</Typography>
                                        <Typography variant="body2">Residual {riskExplanation.latest.residualRisk}</Typography>
                                        <Typography variant="body2">Band {riskExplanation.latest.riskBand}</Typography>
                                        <Typography variant="caption">Methodology {riskExplanation.methodologyVersion}</Typography>
                                        {(riskExplanation.latest.factors || []).map((factor) => (
                                            <Typography key={factor.label} variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                {factor.label}: {factor.points >= 0 ? '+' : ''}{factor.points}
                                            </Typography>
                                        ))}
                                    </Surface>
                                ) : riskExplanation ? (
                                    <Typography variant="body2">No persisted score yet. Complete an assessment to calculate residual risk.</Typography>
                                ) : null}
                            </Stack>
                        )}
                        {detailTab === 2 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2">Open the assessment workspace for this vendor. Existing questionnaires stay linked to the record.</Typography>
                                <Button variant="contained" onClick={() => handleStartAssessment()}>Open assessments</Button>
                            </Stack>
                        )}
                        {detailTab === 3 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2">Evidence must be stored and scanned before it can be downloaded.</Typography>
                                <Button variant="contained" onClick={() => navigate(`/documents?vendorId=${selectedVendor.id}`)}>Open evidence</Button>
                            </Stack>
                        )}
                        {detailTab === 4 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2">Findings and corrective action live in the remediation workspace.</Typography>
                                <Button variant="contained" onClick={() => navigate(`/findings?vendorId=${selectedVendor.id}`)}>Open findings</Button>
                            </Stack>
                        )}
                        {detailTab === 5 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2">Only recorded signals appear. External ratings are not invented.</Typography>
                                <Button variant="contained" onClick={() => navigate('/monitoring')}>Open monitoring</Button>
                            </Stack>
                        )}
                        {detailTab === 6 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2">Generate or continue a decision brief from persisted residual risk.</Typography>
                                <Button variant="contained" onClick={() => navigate(`/decision-briefs?vendorId=${selectedVendor.id}`)}>Open decisions</Button>
                            </Stack>
                        )}
                        {detailTab === 7 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2">Significant actions write tenant-scoped audit events.</Typography>
                                <Button variant="outlined" onClick={() => navigate('/activity-log')}>Open audit log</Button>
                                <Button
                                    color="warning"
                                    onClick={() => {
                                        setOffboardVendor(selectedVendor);
                                        setOffboardNotes('');
                                        setOffboardAck(false);
                                        setOffboardPreview(null);
                                        tprmAPI.offboardPreview(String(selectedVendor.id))
                                            .then((res) => setOffboardPreview(res.data.data))
                                            .catch((err) => setError(err.message));
                                    }}
                                >
                                    Offboard
                                </Button>
                            </Stack>
                        )}
                    </Box>
                )}
            </Drawer>

            <Dialog open={Boolean(offboardVendor)} onClose={() => setOffboardVendor(null)} fullWidth maxWidth="sm">
                <DialogTitle>Offboard vendor</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Termination keeps assessments, evidence, findings, and audit history. Records are not destroyed.
                    </Typography>
                    {offboardPreview?.outstanding && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Open findings: {offboardPreview.outstanding.openFindings}. Open assessments: {offboardPreview.outstanding.openAssessments}. Evidence objects: {offboardPreview.outstanding.evidenceCount}.
                        </Alert>
                    )}
                    <TextField fullWidth multiline minRows={3} label="Exit notes" value={offboardNotes} onChange={(event) => setOffboardNotes(event.target.value)} sx={{ mb: 2 }} />
                    <Button variant="text" onClick={() => setOffboardAck((value) => !value)}>
                        {offboardAck ? 'Outstanding risks acknowledged' : 'Acknowledge outstanding risks'}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOffboardVendor(null)}>Cancel</Button>
                    <Button
                        color="warning"
                        variant="contained"
                        onClick={async () => {
                            if (!offboardVendor) return;
                            try {
                                await tprmAPI.offboard(String(offboardVendor.id), {
                                    exitNotes: offboardNotes,
                                    acknowledgeOutstanding: offboardAck,
                                });
                                setSnackbar({ open: true, message: 'Vendor offboarding recorded. Governance records were kept.', severity: 'success' });
                                setOffboardVendor(null);
                                setSelectedVendor(null);
                                await loadVendors();
                            } catch (err: any) {
                                setSnackbar({ open: true, message: err.message || 'Offboard failed', severity: 'error' });
                            }
                        }}
                    >
                        Confirm offboard
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
