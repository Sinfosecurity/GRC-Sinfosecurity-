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
    RadioGroup,
    FormControlLabel,
    Radio,
    Stepper,
    Step,
    StepLabel,
    CircularProgress,
    Alert,
    Snackbar,
} from '@mui/material';
import { Add, Business, Assessment, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { vendorAPI } from '../services/api';

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
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [assessmentDialog, setAssessmentDialog] = useState(false);
    const [assessmentStep, setAssessmentStep] = useState(0);
    const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
    const [newVendor, setNewVendor] = useState({
        name: '',
        category: '',
        tier: 'Medium' as const,
        contactEmail: '',
        dataAccess: '',
        website: '',
        primaryContact: '',
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
            const response = await vendorAPI.getAll();
            if (response.data.vendors) {
                // Map backend data to frontend format
                const mappedVendors = response.data.vendors.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    category: v.category,
                    tier: v.tier,
                    status: v.status,
                    riskScore: v.inherentRiskScore || 0,
                    complianceScore: 100 - (v.inherentRiskScore || 0),
                    lastAssessment: v.lastAssessmentDate ? new Date(v.lastAssessmentDate).toISOString().split('T')[0] : 'N/A',
                    nextReview: v.nextReviewDate ? new Date(v.nextReviewDate).toISOString().split('T')[0] : 'N/A',
                    contactEmail: v.primaryContact || 'N/A',
                    dataAccess: v.dataCategories?.join(', ') || 'N/A',
                    assessmentStatus: v.assessmentStatus || 'Not Started'
                }));
                setVendors(mappedVendors);
            }
        } catch (err: any) {
            console.error('Failed to load vendors:', err);
            setError(err.response?.data?.message || 'Failed to load vendors. Using mock data.');
            // Keep using mock data on error
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
        try {
            setLoading(true);
            const response = await vendorAPI.create({
                name: newVendor.name,
                category: newVendor.category,
                tier: newVendor.tier,
                primaryContact: newVendor.contactEmail,
                website: newVendor.website,
                businessOwner: newVendor.businessOwner,
                dataCategories: newVendor.dataAccess ? [newVendor.dataAccess] : [],
                services: []
            });
            
            setSnackbar({ open: true, message: 'Vendor added successfully!', severity: 'success' });
            setOpenDialog(false);
            setNewVendor({
                name: '',
                category: '',
                tier: 'Medium',
                contactEmail: '',
                dataAccess: '',
                website: '',
                primaryContact: '',
                businessOwner: ''
            });
            
            // Reload vendors
            await loadVendors();
        } catch (err: any) {
            console.error('Failed to add vendor:', err);
            setSnackbar({ 
                open: true, 
                message: err.response?.data?.message || 'Failed to add vendor', 
                severity: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewVendor = (vendor: Vendor) => {
        setSelectedVendor(vendor);
    };

    const handleStartAssessment = () => {
        setSelectedVendor(null);
        setAssessmentDialog(true);
        setAssessmentStep(0);
        setAssessmentAnswers({});
    };

    const assessmentSections = [
        {
            title: 'Information Security',
            questions: [
                {
                    id: 'sec_1',
                    question: 'Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?',
                    options: ['Yes - ISO 27001', 'Yes - SOC 2 Type II', 'Yes - Both', 'No certification', 'In progress'],
                    weight: 10
                },
                {
                    id: 'sec_2',
                    question: 'How does the vendor handle data encryption?',
                    options: ['Encryption at rest and in transit (AES-256/TLS 1.3)', 'Encryption at rest only', 'Encryption in transit only', 'No encryption', 'Unknown'],
                    weight: 9
                },
                {
                    id: 'sec_3',
                    question: 'What is the vendor\'s incident response time commitment?',
                    options: ['< 1 hour (Critical incidents)', '< 4 hours', '< 24 hours', 'No SLA defined', 'Unknown'],
                    weight: 8
                },
                {
                    id: 'sec_4',
                    question: 'Does the vendor conduct regular penetration testing?',
                    options: ['Quarterly by third-party', 'Annually by third-party', 'Internal testing only', 'No testing', 'Unknown'],
                    weight: 7
                }
            ]
        },
        {
            title: 'Data Privacy & Compliance',
            questions: [
                {
                    id: 'priv_1',
                    question: 'Is the vendor GDPR compliant (if processing EU data)?',
                    options: ['Yes - Fully compliant with DPA', 'Yes - Standard contractual clauses', 'Partially compliant', 'Not applicable', 'No'],
                    weight: 10
                },
                {
                    id: 'priv_2',
                    question: 'Where is customer data stored geographically?',
                    options: ['EU/EEA only', 'US with Privacy Shield', 'Multi-region with data residency options', 'Outside EU/US', 'Unknown'],
                    weight: 8
                },
                {
                    id: 'priv_3',
                    question: 'Does the vendor have a Data Processing Agreement (DPA)?',
                    options: ['Yes - Signed and current', 'Yes - Pending signature', 'Standard terms only', 'No DPA', 'Not required'],
                    weight: 9
                },
                {
                    id: 'priv_4',
                    question: 'How does the vendor handle data subject requests (GDPR Art. 15-22)?',
                    options: ['Automated portal < 30 days', 'Manual process < 30 days', 'Manual process > 30 days', 'No defined process', 'Unknown'],
                    weight: 7
                }
            ]
        },
        {
            title: 'Access Control & Authentication',
            questions: [
                {
                    id: 'access_1',
                    question: 'Does the vendor support Multi-Factor Authentication (MFA)?',
                    options: ['Yes - Mandatory for all users', 'Yes - Optional', 'Yes - Admin only', 'No', 'Unknown'],
                    weight: 9
                },
                {
                    id: 'access_2',
                    question: 'What is the vendor\'s password policy?',
                    options: ['Complex passwords + MFA + rotation', 'Complex passwords + rotation', 'Basic password requirements', 'No specific policy', 'Unknown'],
                    weight: 7
                },
                {
                    id: 'access_3',
                    question: 'Does the vendor support SSO (Single Sign-On)?',
                    options: ['Yes - SAML 2.0', 'Yes - OAuth 2.0', 'Yes - Both', 'No', 'Enterprise plan only'],
                    weight: 6
                },
                {
                    id: 'access_4',
                    question: 'How are user access reviews conducted?',
                    options: ['Automated quarterly reviews', 'Manual quarterly reviews', 'Annual reviews', 'No formal process', 'Unknown'],
                    weight: 7
                }
            ]
        },
        {
            title: 'Business Continuity & Availability',
            questions: [
                {
                    id: 'bc_1',
                    question: 'What is the vendor\'s uptime SLA?',
                    options: ['99.99% (4 nines)', '99.9% (3 nines)', '99.5%', 'No SLA', 'Unknown'],
                    weight: 8
                },
                {
                    id: 'bc_2',
                    question: 'Does the vendor have a documented Business Continuity Plan (BCP)?',
                    options: ['Yes - Tested annually', 'Yes - Tested bi-annually', 'Yes - Not tested', 'No', 'Unknown'],
                    weight: 9
                },
                {
                    id: 'bc_3',
                    question: 'What is the vendor\'s Recovery Time Objective (RTO)?',
                    options: ['< 1 hour', '< 4 hours', '< 24 hours', '> 24 hours', 'Not defined'],
                    weight: 8
                },
                {
                    id: 'bc_4',
                    question: 'Does the vendor have redundant infrastructure?',
                    options: ['Multi-region active-active', 'Multi-region active-passive', 'Single region redundant', 'No redundancy', 'Unknown'],
                    weight: 7
                }
            ]
        },
        {
            title: 'Vendor Management & Due Diligence',
            questions: [
                {
                    id: 'mgmt_1',
                    question: 'How long has the vendor been in business?',
                    options: ['10+ years', '5-10 years', '2-5 years', '< 2 years', 'Startup'],
                    weight: 6
                },
                {
                    id: 'mgmt_2',
                    question: 'Does the vendor have cyber insurance?',
                    options: ['Yes - $10M+ coverage', 'Yes - $5M-$10M', 'Yes - < $5M', 'No', 'Unknown'],
                    weight: 7
                },
                {
                    id: 'mgmt_3',
                    question: 'Has the vendor had any security breaches in the past 3 years?',
                    options: ['No breaches', 'Minor breach - quickly resolved', 'Major breach - resolved', 'Multiple breaches', 'Unknown'],
                    weight: 10
                },
                {
                    id: 'mgmt_4',
                    question: 'Does the vendor conduct third-party security audits?',
                    options: ['Yes - Annually', 'Yes - Every 2 years', 'Rarely', 'No', 'Unknown'],
                    weight: 8
                }
            ]
        }
    ];

    const calculateAssessmentScore = () => {
        let totalScore = 0;
        let maxScore = 0;

        assessmentSections.forEach(section => {
            section.questions.forEach(q => {
                maxScore += q.weight * 4; // Max points = weight * 4 (best answer)
                const answer = assessmentAnswers[q.id];
                if (answer) {
                    const answerIndex = q.options.indexOf(answer);
                    // Score: first option = full points, decreasing for each subsequent option
                    const points = answerIndex >= 0 ? (4 - answerIndex) * q.weight : 0;
                    totalScore += Math.max(0, points);
                }
            });
        });

        return Math.round((totalScore / maxScore) * 100);
    };

    const handleCompleteAssessment = () => {
        const score = calculateAssessmentScore();
        const riskScore = 100 - score; // Inverse of compliance score
        
        if (selectedVendor) {
            const updatedVendor = {
                ...selectedVendor,
                riskScore,
                complianceScore: score,
                lastAssessment: new Date().toISOString().split('T')[0],
                assessmentStatus: 'Completed' as const
            };
            
            setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
        }
        
        alert(`Vendor Assessment Completed!\n\nCompliance Score: ${score}%\nRisk Score: ${riskScore}%\n\nRisk Level: ${riskScore < 30 ? 'Low' : riskScore < 50 ? 'Medium' : riskScore < 70 ? 'High' : 'Critical'}\n\nRecommendation: ${riskScore < 30 ? 'Approved for engagement' : riskScore < 50 ? 'Approved with monitoring' : riskScore < 70 ? 'Additional controls required' : 'High risk - executive approval needed'}`);
        
        setAssessmentDialog(false);
        setAssessmentStep(0);
        setAssessmentAnswers({});
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
                    disabled={loading}
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

            {/* Error Alert */}
            {error && (
                <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading State */}
            {loading && vendors.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress />
                </Box>
            )}

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
                                onClick={handleStartAssessment}
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

            {/* Vendor Risk Assessment Dialog */}
            <Dialog
                open={assessmentDialog}
                onClose={() => setAssessmentDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        minHeight: '600px'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white', pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Assessment sx={{ fontSize: 32, color: '#667eea' }} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                Vendor Risk Assessment
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {selectedVendor?.name || 'Third-Party Risk Evaluation'}
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* Progress Stepper */}
                    <Stepper activeStep={assessmentStep} sx={{ mt: 2 }}>
                        {assessmentSections.map((section, index) => (
                            <Step key={index}>
                                <StepLabel
                                    sx={{
                                        '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.7)' },
                                        '& .Mui-active': { color: '#667eea' },
                                        '& .Mui-completed': { color: '#43e97b' }
                                    }}
                                >
                                    {section.title}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    
                    {/* Progress Bar */}
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Overall Progress
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#667eea', fontWeight: 600 }}>
                                {Math.round((Object.keys(assessmentAnswers).length / (assessmentSections.reduce((sum, s) => sum + s.questions.length, 0))) * 100)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={(Object.keys(assessmentAnswers).length / (assessmentSections.reduce((sum, s) => sum + s.questions.length, 0))) * 100}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.1)',
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                },
                            }}
                        />
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 3 }}>
                    {assessmentStep < assessmentSections.length && (
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#667eea' }}>
                                {assessmentSections[assessmentStep].title}
                            </Typography>
                            
                            {assessmentSections[assessmentStep].questions.map((q, qIndex) => (
                                <Box
                                    key={q.id}
                                    sx={{
                                        mb: 4,
                                        p: 3,
                                        bgcolor: 'rgba(102, 126, 234, 0.05)',
                                        borderRadius: 2,
                                        border: '1px solid rgba(102, 126, 234, 0.2)',
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
                                        {qIndex + 1}. {q.question}
                                    </Typography>
                                    
                                    <RadioGroup
                                        value={assessmentAnswers[q.id] || ''}
                                        onChange={(e) => setAssessmentAnswers({ ...assessmentAnswers, [q.id]: e.target.value })}
                                    >
                                        {q.options.map((option, optIndex) => (
                                            <FormControlLabel
                                                key={optIndex}
                                                value={option}
                                                control={
                                                    <Radio
                                                        sx={{
                                                            color: 'rgba(255,255,255,0.5)',
                                                            '&.Mui-checked': { color: '#667eea' },
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2" sx={{ color: 'white' }}>
                                                        {option}
                                                    </Typography>
                                                }
                                                sx={{
                                                    mb: 1,
                                                    ml: 0,
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    '&:hover': {
                                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                                    },
                                                }}
                                            />
                                        ))}
                                    </RadioGroup>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button onClick={() => setAssessmentDialog(false)}>Cancel</Button>
                    
                    {assessmentStep > 0 && (
                        <Button
                            onClick={() => setAssessmentStep(assessmentStep - 1)}
                            variant="outlined"
                        >
                            Previous
                        </Button>
                    )}
                    
                    {assessmentStep < assessmentSections.length - 1 ? (
                        <Button
                            onClick={() => setAssessmentStep(assessmentStep + 1)}
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                        >
                            Next Section
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCompleteAssessment}
                            variant="contained"
                            disabled={Object.keys(assessmentAnswers).length < assessmentSections.reduce((sum, s) => sum + s.questions.length, 0)}
                            sx={{
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '1rem',
                                px: 4,
                                '&.Mui-disabled': {
                                    background: 'rgba(255,255,255,0.12)',
                                    color: 'rgba(255,255,255,0.3)',
                                },
                            }}
                        >
                            Complete
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
