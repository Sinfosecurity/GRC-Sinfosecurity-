import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    LinearProgress,
    Alert,
    Snackbar,
} from '@mui/material';
import { Add, Business, Assessment, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import QueryState from '../components/QueryState';
import { tprmAPI, vendorAPI } from '../services/api';

interface Vendor {
    id: string | number;
    name: string;
    category: string;
    tier: 'Critical' | 'High' | 'Medium' | 'Low';
    status: string;
    riskScore: number;
    complianceScore: number;
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

const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
        'Critical': '#f5576c',
        'High': '#fa709a',
        'Medium': '#fee140',
        'Low': '#43e97b'
    };
    return colors[tier] || '#667eea';
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        'Not Started': '#888',
        'In Progress': '#00f2fe',
        'Completed': '#43e97b',
        'Overdue': '#f5576c'
    };
    return colors[status] || '#667eea';
};

const getScoreColor = (score: number) => {
    if (score >= 90) return '#43e97b';
    if (score >= 75) return '#00f2fe';
    if (score >= 60) return '#fee140';
    return '#f5576c';
};

export default function VendorManagement() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [tabValue, setTabValue] = useState(0);
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
        businessOwner: ''
    });

    // Load vendors and statistics on mount
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
                    name: v.name,
                    category: v.category,
                    tier: displayTier(v.tier) as Vendor['tier'],
                    status: v.status,
                    riskScore: v.inherentRiskScore || 0,
                    complianceScore: 100 - (v.inherentRiskScore || 0),
                    lastAssessment: v.lastAssessmentDate ? new Date(v.lastAssessmentDate).toISOString().split('T')[0] : 'N/A',
                    nextReview: v.nextReviewDate ? new Date(v.nextReviewDate).toISOString().split('T')[0] : 'N/A',
                    contactEmail: v.contactEmail || v.primaryContact || 'N/A',
                    dataAccess: (v.dataTypesAccessed || v.dataCategories || []).join(', ') || 'N/A',
                    assessmentStatus: displayAssessmentStatus(v.assessmentStatus)
                }));
                setVendors(mappedVendors);
            }
        } catch (err: any) {
            console.error('Failed to load vendors:', err);
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
        } catch (err) {
            console.error('Failed to load statistics:', err);
        }
    };

    const criticalVendors = statistics?.tierDistribution?.Critical || vendors.filter(v => v.tier === 'Critical').length;
    const overdueAssessments = vendors.filter(v => v.assessmentStatus === 'Overdue').length;
    const avgRiskScore = statistics?.averageRiskScore || (vendors.reduce((sum, v) => sum + v.riskScore, 0) / vendors.length).toFixed(0);

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
                businessOwner: ''
            });
            await loadVendors();
            await loadStatistics();
        } catch (err: any) {
            setSnackbar({
                open: true,
                message: err.message || 'Failed to add vendor',
                severity: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleViewVendor = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setRiskExplanation(null);
        setRiskExplanationError(null);
        tprmAPI.riskExplanation(String(vendor.id))
            .then((response) => setRiskExplanation(response.data.data))
            .catch((err: any) => setRiskExplanationError(err.message || 'Unable to load risk explanation'));
    };

    const handleStartAssessment = (vendor?: Vendor | null) => {
        const target = vendor || selectedVendor;
        if (target?.id) {
            navigate(`/assessments?vendorId=${target.id}`);
            return;
        }
        navigate('/assessments');
    };

    return (
        <Box>
            {/* Snackbar for notifications */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Vendor Risk Management (TPRM)
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Assess and manage third-party vendor risks
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenDialog(true)}
                    disabled={saving}
                    sx={{
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: '#000',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
                        }
                    }}
                >
                    Add Vendor
                </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
                <QueryState
                    loading={loading && vendors.length === 0}
                    error={error}
                    empty={!loading && vendors.length === 0}
                    emptyTitle="No vendors yet"
                    emptyBody="Add a vendor with type, category, contact, and services. The new record appears in this list immediately."
                >
                    <span />
                </QueryState>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                                {vendors.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Total Vendors
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#f5576c', fontWeight: 700 }}>
                                {criticalVendors}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Critical Vendors
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: getScoreColor(Number(avgRiskScore)), fontWeight: 700 }}>
                                {avgRiskScore}%
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Avg Risk Score
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: overdueAssessments > 0 ? '#f5576c' : '#43e97b', fontWeight: 700 }}>
                                {overdueAssessments}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Overdue Assessments
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tier Distribution */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Vendor Risk Tier Distribution
                    </Typography>
                    <Grid container spacing={2}>
                        {tiers.map(tier => {
                            const count = vendors.filter(v => v.tier === tier.label).length;
                            const percentage = ((count / vendors.length) * 100).toFixed(0);
                            return (
                                <Grid item xs={12} sm={6} md={3} key={tier.value}>
                                    <Box sx={{
                                        p: 2,
                                        border: '2px solid',
                                        borderColor: getTierColor(tier.label),
                                        borderRadius: 2,
                                        bgcolor: `${getTierColor(tier.label)}10`
                                    }}>
                                        <Typography variant="h4" sx={{ color: getTierColor(tier.label), fontWeight: 700 }}>
                                            {count}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            {tier.label} Tier ({percentage}%)
                                        </Typography>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </CardContent>
            </Card>

            {/* Vendors Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', mb: 2 }}>
                        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                            <Tab label="All Vendors" />
                            <Tab label="Critical & High" />
                            <Tab label="Pending Assessments" />
                        </Tabs>
                    </Box>

                    <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Vendor</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Category</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Tier</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Risk Score</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Compliance</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Assessment</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Next Review</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vendors
                                    .filter(v => {
                                        if (tabValue === 1) return v.tier === 'Critical' || v.tier === 'High';
                                        if (tabValue === 2) return v.assessmentStatus !== 'Completed';
                                        return true;
                                    })
                                    .map((vendor) => (
                                        <TableRow
                                            key={vendor.id}
                                            sx={{
                                                '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' },
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => handleViewVendor(vendor)}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Business sx={{ color: '#667eea' }} />
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                                                            {vendor.name}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                            {vendor.contactEmail}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={vendor.category}
                                                    size="small"
                                                    sx={{ bgcolor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={vendor.tier}
                                                    size="small"
                                                    icon={
                                                        vendor.tier === 'Critical' ? <ErrorIcon /> :
                                                            vendor.tier === 'High' ? <Warning /> :
                                                                <CheckCircle />
                                                    }
                                                    sx={{
                                                        bgcolor: `${getTierColor(vendor.tier)}20`,
                                                        color: getTierColor(vendor.tier),
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ width: 100 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption">{vendor.riskScore}%</Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={vendor.riskScore}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: getScoreColor(vendor.riskScore),
                                                                borderRadius: 3
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ width: 100 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption">{vendor.complianceScore}%</Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={vendor.complianceScore}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: getScoreColor(vendor.complianceScore),
                                                                borderRadius: 3
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={vendor.assessmentStatus}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${getStatusColor(vendor.assessmentStatus)}20`,
                                                        color: getStatusColor(vendor.assessmentStatus),
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                {vendor.nextReview}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    startIcon={<Assessment />}
                                                    sx={{ color: '#667eea' }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleStartAssessment(vendor);
                                                    }}
                                                >
                                                    Assess
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Add Vendor Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>Add New Vendor</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Vendor Name"
                                value={newVendor.name}
                                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel id="vendor-type-label">Vendor type</InputLabel>
                                <Select
                                    labelId="vendor-type-label"
                                    inputProps={{ 'aria-label': 'Vendor type' }}
                                    value={newVendor.vendorType}
                                    onChange={(e) => setNewVendor({ ...newVendor, vendorType: e.target.value })}
                                    label="Vendor type"
                                >
                                    {vendorTypes.map((item) => (
                                        <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel id="vendor-category-label">Category</InputLabel>
                                <Select
                                    labelId="vendor-category-label"
                                    inputProps={{ 'aria-label': 'Category' }}
                                    value={newVendor.category}
                                    onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                                    label="Category"
                                >
                                    {categories.map((cat) => (
                                        <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Risk Tier</InputLabel>
                                <Select
                                    value={newVendor.tier}
                                    onChange={(e) => setNewVendor({ ...newVendor, tier: e.target.value })}
                                    label="Risk Tier"
                                >
                                    {tiers.map((tier) => (
                                        <MenuItem key={tier.value} value={tier.value}>{tier.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Primary contact"
                                value={newVendor.primaryContact}
                                onChange={(e) => setNewVendor({ ...newVendor, primaryContact: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Contact Email"
                                type="email"
                                value={newVendor.contactEmail}
                                onChange={(e) => setNewVendor({ ...newVendor, contactEmail: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Website"
                                value={newVendor.website}
                                onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Business owner"
                                value={newVendor.businessOwner}
                                onChange={(e) => setNewVendor({ ...newVendor, businessOwner: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Services provided"
                                value={newVendor.servicesProvided}
                                onChange={(e) => setNewVendor({ ...newVendor, servicesProvided: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Data Access"
                                value={newVendor.dataAccess}
                                onChange={(e) => setNewVendor({ ...newVendor, dataAccess: e.target.value })}
                                placeholder="e.g., Customer PII, Payment Data, Employee Records"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddVendor}
                        variant="contained"
                        disabled={saving || !newVendor.name || !newVendor.vendorType || !newVendor.category || !newVendor.primaryContact || !newVendor.contactEmail || !newVendor.servicesProvided}
                        sx={{
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: '#000'
                        }}
                    >
                        Add Vendor
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Vendor Detail Dialog */}
            <Dialog
                open={!!selectedVendor}
                onClose={() => setSelectedVendor(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                {selectedVendor && (
                    <>
                        <DialogTitle sx={{ color: 'white' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Business sx={{ fontSize: 40, color: '#667eea' }} />
                                <Box>
                                    <Typography variant="h5">{selectedVendor.name}</Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {selectedVendor.category}
                                    </Typography>
                                </Box>
                            </Box>
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Risk Tier
                                    </Typography>
                                    <Chip
                                        label={selectedVendor.tier}
                                        sx={{
                                            bgcolor: `${getTierColor(selectedVendor.tier)}20`,
                                            color: getTierColor(selectedVendor.tier),
                                            fontWeight: 600,
                                            mt: 0.5
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Assessment Status
                                    </Typography>
                                    <Chip
                                        label={selectedVendor.assessmentStatus}
                                        sx={{
                                            bgcolor: `${getStatusColor(selectedVendor.assessmentStatus)}20`,
                                            color: getStatusColor(selectedVendor.assessmentStatus),
                                            mt: 0.5
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Risk Score
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: getScoreColor(selectedVendor.riskScore) }}>
                                        {selectedVendor.riskScore}%
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Compliance Score
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: getScoreColor(selectedVendor.complianceScore) }}>
                                        {selectedVendor.complianceScore}%
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Data Access
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'white', mt: 0.5 }}>
                                        {selectedVendor.dataAccess}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Last Assessment
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'white', mt: 0.5 }}>
                                        {selectedVendor.lastAssessment}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        Next Review
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'white', mt: 0.5 }}>
                                        {selectedVendor.nextReview}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                                        Explainable risk
                                    </Typography>
                                    {riskExplanationError && <Alert severity="error" sx={{ mb: 1 }}>{riskExplanationError}</Alert>}
                                    {!riskExplanationError && !riskExplanation && (
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Loading risk explanation…</Typography>
                                    )}
                                    {riskExplanation?.latest ? (
                                        <Box>
                                            <Typography variant="body2" sx={{ color: 'white' }}>
                                                Inherent risk {riskExplanation.latest.inherentRisk}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'white' }}>
                                                Control effectiveness {riskExplanation.latest.controlEffectiveness}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'white' }}>
                                                Residual risk {riskExplanation.latest.residualRisk}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'white' }}>
                                                Risk band {riskExplanation.latest.riskBand}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'white' }}>
                                                Score methodology version {riskExplanation.methodologyVersion}
                                            </Typography>
                                            {(riskExplanation.latest.factors || []).map((factor) => (
                                                <Typography key={factor.label} variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                                                    {factor.label}: {factor.points >= 0 ? '+' : ''}{factor.points}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ) : riskExplanation ? (
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            No persisted score yet. Complete an assessment to calculate residual risk.
                                        </Typography>
                                    ) : null}
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-start', px: 3, pb: 2 }}>
                            <Button onClick={() => setSelectedVendor(null)}>Close</Button>
                            <Button variant="contained" startIcon={<Assessment />} onClick={() => handleStartAssessment()}>
                                Start Assessment
                            </Button>
                            <Button onClick={() => navigate(`/documents?vendorId=${selectedVendor.id}`)}>Evidence</Button>
                            <Button onClick={() => navigate(`/findings?vendorId=${selectedVendor.id}`)}>Findings</Button>
                            <Button onClick={() => navigate(`/decision-briefs?vendorId=${selectedVendor.id}`)}>Decision brief</Button>
                            <Button onClick={() => navigate('/monitoring')}>Monitoring</Button>
                            <Button onClick={() => navigate(`/reports?vendorId=${selectedVendor.id}`)}>Reports</Button>
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
                        </DialogActions>
                    </>
                )}
            </Dialog>

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
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Exit notes"
                        value={offboardNotes}
                        onChange={(event) => setOffboardNotes(event.target.value)}
                        sx={{ mb: 2 }}
                    />
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
