import { useState } from 'react';
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
    LinearProgress
} from '@mui/material';
import { Add, Business, Assessment, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';

interface Vendor {
    id: number;
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

const mockVendors: Vendor[] = [
    {
        id: 1,
        name: 'CloudStorage Pro',
        category: 'Cloud Services',
        tier: 'Critical',
        status: 'Active',
        riskScore: 85,
        complianceScore: 92,
        lastAssessment: '2024-11-15',
        nextReview: '2025-02-15',
        contactEmail: 'security@cloudstorage.com',
        dataAccess: 'Customer PII, Financial Data',
        assessmentStatus: 'Completed'
    },
    {
        id: 2,
        name: 'SecurePayments Inc',
        category: 'Payment Processing',
        tier: 'Critical',
        status: 'Active',
        riskScore: 90,
        complianceScore: 95,
        lastAssessment: '2024-12-01',
        nextReview: '2025-03-01',
        contactEmail: 'compliance@securepay.com',
        dataAccess: 'Payment Card Data',
        assessmentStatus: 'Completed'
    },
    {
        id: 3,
        name: 'Analytics Dashboard',
        category: 'Analytics',
        tier: 'High',
        status: 'Active',
        riskScore: 75,
        complianceScore: 80,
        lastAssessment: '2024-10-20',
        nextReview: '2025-01-20',
        contactEmail: 'support@analytics.com',
        dataAccess: 'Usage Data',
        assessmentStatus: 'In Progress'
    },
    {
        id: 4,
        name: 'Email Marketing Suite',
        category: 'Marketing',
        tier: 'Medium',
        status: 'Active',
        riskScore: 70,
        complianceScore: 75,
        lastAssessment: '2024-09-10',
        nextReview: '2024-12-10',
        contactEmail: 'info@emailsuite.com',
        dataAccess: 'Contact Information',
        assessmentStatus: 'Overdue'
    },
    {
        id: 5,
        name: 'HR Software Solutions',
        category: 'Human Resources',
        tier: 'High',
        status: 'Active',
        riskScore: 78,
        complianceScore: 88,
        lastAssessment: '2024-11-01',
        nextReview: '2025-02-01',
        contactEmail: 'security@hrsolutions.com',
        dataAccess: 'Employee Data',
        assessmentStatus: 'Completed'
    }
];

const categories = ['Cloud Services', 'Payment Processing', 'Analytics', 'Marketing', 'Human Resources', 'IT Services', 'Security', 'Other'];
const tiers = ['Critical', 'High', 'Medium', 'Low'];

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
    const [vendors, setVendors] = useState(mockVendors);
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [newVendor, setNewVendor] = useState({
        name: '',
        category: '',
        tier: 'Medium' as const,
        contactEmail: '',
        dataAccess: ''
    });

    const criticalVendors = vendors.filter(v => v.tier === 'Critical').length;
    const overdueAssessments = vendors.filter(v => v.assessmentStatus === 'Overdue').length;
    const avgRiskScore = (vendors.reduce((sum, v) => sum + v.riskScore, 0) / vendors.length).toFixed(0);
    // const avgComplianceScore = (vendors.reduce((sum, v) => sum + v.complianceScore, 0) / vendors.length).toFixed(0);

    const handleAddVendor = () => {
        const vendor: Vendor = {
            id: vendors.length + 1,
            ...newVendor,
            status: 'Active',
            riskScore: 0,
            complianceScore: 0,
            lastAssessment: 'N/A',
            nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assessmentStatus: 'Not Started'
        };
        setVendors([...vendors, vendor]);
        setOpenDialog(false);
        setNewVendor({
            name: '',
            category: '',
            tier: 'Medium',
            contactEmail: '',
            dataAccess: ''
        });
    };

    const handleViewVendor = (vendor: Vendor) => {
        setSelectedVendor(vendor);
    };

    return (
        <Box>
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
                            const count = vendors.filter(v => v.tier === tier).length;
                            const percentage = ((count / vendors.length) * 100).toFixed(0);
                            return (
                                <Grid item xs={12} sm={6} md={3} key={tier}>
                                    <Box sx={{
                                        p: 2,
                                        border: '2px solid',
                                        borderColor: getTierColor(tier),
                                        borderRadius: 2,
                                        bgcolor: `${getTierColor(tier)}10`
                                    }}>
                                        <Typography variant="h4" sx={{ color: getTierColor(tier), fontWeight: 700 }}>
                                            {count}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            {tier} Tier ({percentage}%)
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
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={newVendor.category}
                                    onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                                    label="Category"
                                >
                                    {categories.map(cat => (
                                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Risk Tier</InputLabel>
                                <Select
                                    value={newVendor.tier}
                                    onChange={(e) => setNewVendor({ ...newVendor, tier: e.target.value as any })}
                                    label="Risk Tier"
                                >
                                    {tiers.map(tier => (
                                        <MenuItem key={tier} value={tier}>{tier}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
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
                        disabled={!newVendor.name || !newVendor.category || !newVendor.contactEmail}
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
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelectedVendor(null)}>Close</Button>
                            <Button
                                variant="contained"
                                startIcon={<Assessment />}
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                            >
                                Start Assessment
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
