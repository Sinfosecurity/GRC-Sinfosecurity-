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
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Shield,
    Upload,
    Download,
    Share,
    Visibility,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    Link as LinkIcon,
    Security,
    Assessment,
    VerifiedUser,
    Description,
    CloudUpload,
    Lock,
    AccessTime,
} from '@mui/icons-material';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

// Mock data
const mockReports = [
    {
        id: 'soc_1',
        type: 'SOC 2 Type II',
        reportPeriod: '2024-01-01 to 2024-12-31',
        issueDate: '2024-12-01',
        expiryDate: '2025-12-01',
        auditor: 'Deloitte',
        status: 'active',
        fileName: 'SOC2_Type2_2024.pdf',
        fileSize: '2.4 MB',
        downloads: 47,
        lastAccessed: '2024-12-10',
        accessControl: 'NDA Required',
    },
    {
        id: 'soc_2',
        type: 'SOC 1 Type II',
        reportPeriod: '2024-01-01 to 2024-12-31',
        issueDate: '2024-11-15',
        expiryDate: '2025-11-15',
        auditor: 'KPMG',
        status: 'active',
        fileName: 'SOC1_Type2_2024.pdf',
        fileSize: '1.8 MB',
        downloads: 23,
        lastAccessed: '2024-12-08',
        accessControl: 'Internal Only',
    },
    {
        id: 'soc_3',
        type: 'SOC 2 Type I',
        reportPeriod: '2023-01-01 to 2023-12-31',
        issueDate: '2023-12-15',
        expiryDate: '2024-12-15',
        auditor: 'PwC',
        status: 'expired',
        fileName: 'SOC2_Type1_2023.pdf',
        fileSize: '1.9 MB',
        downloads: 152,
        lastAccessed: '2024-11-20',
        accessControl: 'Public',
    },
];

const soc2Criteria = [
    {
        id: 'CC1',
        name: 'Control Environment',
        description: 'COSO principles related to integrity, ethics, and competence',
        controls: 12,
        tested: 12,
        passed: 11,
        status: 'partial',
        lastTested: '2024-12-05',
    },
    {
        id: 'CC2',
        name: 'Communication and Information',
        description: 'Internal and external communication of information',
        controls: 8,
        tested: 8,
        passed: 8,
        status: 'passed',
        lastTested: '2024-12-01',
    },
    {
        id: 'CC3',
        name: 'Risk Assessment',
        description: 'Risk identification and assessment processes',
        controls: 10,
        tested: 10,
        passed: 10,
        status: 'passed',
        lastTested: '2024-11-28',
    },
    {
        id: 'CC4',
        name: 'Monitoring Activities',
        description: 'Ongoing and separate evaluations',
        controls: 6,
        tested: 5,
        passed: 5,
        status: 'in-progress',
        lastTested: '2024-12-10',
    },
    {
        id: 'CC5',
        name: 'Control Activities',
        description: 'Policies and procedures for control objectives',
        controls: 15,
        tested: 15,
        passed: 14,
        status: 'partial',
        lastTested: '2024-12-08',
    },
];

export default function SOCReports() {
    const [tabValue, setTabValue] = useState(0);
    const [reports] = useState(mockReports);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<typeof mockReports[0] | null>(null);

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            active: '#43e97b',
            expired: '#f5576c',
            pending: '#feca57',
        };
        return colors[status] || '#667eea';
    };

    const getCriteriaStatusIcon = (status: string) => {
        if (status === 'passed') return <CheckCircle sx={{ color: '#43e97b' }} />;
        if (status === 'partial') return <Warning sx={{ color: '#feca57' }} />;
        if (status === 'in-progress') return <AccessTime sx={{ color: '#667eea' }} />;
        return <ErrorIcon sx={{ color: '#f5576c' }} />;
    };

    const activeReports = reports.filter(r => r.status === 'active').length;
    const totalDownloads = reports.reduce((sum, r) => sum + r.downloads, 0);
    const soc2Progress = Math.round((soc2Criteria.reduce((sum, c) => sum + c.passed, 0) / soc2Criteria.reduce((sum, c) => sum + c.controls, 0)) * 100);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        SOC Reports & Trust Center
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Manage SOC 1, SOC 2 attestations and control readiness
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' },
                    }}
                >
                    Upload Report
                </Button>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                        Active Reports
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {activeReports}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#43e97b20', p: 2, borderRadius: 2 }}>
                                    <Shield sx={{ color: '#43e97b' }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                        SOC 2 Readiness
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#667eea' }}>
                                        {soc2Progress}%
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#667eea20', p: 2, borderRadius: 2 }}>
                                    <Assessment sx={{ color: '#667eea' }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                        Total Downloads
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {totalDownloads}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#feca5720', p: 2, borderRadius: 2 }}>
                                    <Download sx={{ color: '#feca57' }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                        Criteria Status
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {soc2Criteria.filter(c => c.status === 'passed').length}/{soc2Criteria.length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#43e97b20', p: 2, borderRadius: 2 }}>
                                    <VerifiedUser sx={{ color: '#43e97b' }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        px: 2,
                        '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)' },
                        '& .Mui-selected': { color: '#667eea' },
                    }}
                >
                    <Tab icon={<Description />} label="Reports Vault" iconPosition="start" />
                    <Tab icon={<Assessment />} label="SOC 2 Readiness" iconPosition="start" />
                    <Tab icon={<Security />} label="SOC 1 Controls" iconPosition="start" />
                    <Tab icon={<Share />} label="Trust Center" iconPosition="start" />
                </Tabs>

                {/* Tab 1: Reports Vault */}
                <TabPanel value={tabValue} index={0}>
                    <CardContent>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Report Type
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Report Period
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Auditor
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Status
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Downloads
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Access Control
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reports.map((report) => (
                                        <TableRow key={report.id} hover>
                                            <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                <Box>
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                        {report.type}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                        {report.fileName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                {report.reportPeriod}
                                            </TableCell>
                                            <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                {report.auditor}
                                            </TableCell>
                                            <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                <Chip
                                                    label={report.status.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${getStatusColor(report.status)}20`,
                                                        color: getStatusColor(report.status),
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                {report.downloads}
                                            </TableCell>
                                            <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                <Chip
                                                    icon={<Lock sx={{ fontSize: 16 }} />}
                                                    label={report.accessControl}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                                        color: '#667eea',
                                                        border: '1px solid rgba(102, 126, 234, 0.3)',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Tooltip title="View Report">
                                                        <IconButton size="small" sx={{ color: '#667eea' }}>
                                                            <Visibility fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Download">
                                                        <IconButton size="small" sx={{ color: '#43e97b' }}>
                                                            <Download fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Share">
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: '#feca57' }}
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShareDialogOpen(true);
                                                            }}
                                                        >
                                                            <Share fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </TabPanel>

                {/* Tab 2: SOC 2 Readiness */}
                <TabPanel value={tabValue} index={1}>
                    <CardContent>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                SOC 2 Trust Services Criteria
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Track control implementation and testing progress across COSO principles
                            </Typography>
                        </Box>

                        <Grid container spacing={3}>
                            {soc2Criteria.map((criteria) => (
                                <Grid item xs={12} key={criteria.id}>
                                    <Card sx={{
                                        bgcolor: 'rgba(102, 126, 234, 0.05)',
                                        border: '1px solid rgba(102, 126, 234, 0.2)',
                                    }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                        {getCriteriaStatusIcon(criteria.status)}
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                            {criteria.id}: {criteria.name}
                                                        </Typography>
                                                        <Chip
                                                            label={`${criteria.passed}/${criteria.controls} Passed`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#43e97b20',
                                                                color: '#43e97b',
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                                                        {criteria.description}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 3 }}>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                                Total Controls
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {criteria.controls}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                                Tested
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {criteria.tested}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                                Last Tested
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {criteria.lastTested}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ minWidth: 200 }}>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                                                        Completion Progress
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={(criteria.passed / criteria.controls) * 100}
                                                        sx={{
                                                            height: 8,
                                                            borderRadius: 4,
                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: criteria.status === 'passed' ? '#43e97b' : '#feca57',
                                                            },
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ color: '#667eea', mt: 0.5, display: 'block', textAlign: 'right' }}>
                                                        {Math.round((criteria.passed / criteria.controls) * 100)}%
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </TabPanel>

                {/* Tab 3: SOC 1 Controls */}
                <TabPanel value={tabValue} index={2}>
                    <CardContent>
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Security sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                SOC 1 Controls Management
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, maxWidth: 600, mx: 'auto' }}>
                                Track financial controls and user entity controls relevant to SOC 1 Type II attestations
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Assessment />}
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': { background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' },
                                }}
                            >
                                Configure SOC 1 Controls
                            </Button>
                        </Box>
                    </CardContent>
                </TabPanel>

                {/* Tab 4: Trust Center */}
                <TabPanel value={tabValue} index={3}>
                    <CardContent>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Public Trust Center
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Share compliance documentation with prospects and customers
                            </Typography>
                        </Box>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card sx={{
                                    bgcolor: 'rgba(67, 233, 123, 0.05)',
                                    border: '1px solid rgba(67, 233, 123, 0.2)',
                                }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <LinkIcon sx={{ color: '#43e97b' }} />
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                Trust Center URL
                                            </Typography>
                                        </Box>
                                        <TextField
                                            fullWidth
                                            value="https://trust.sinfosecurity.com"
                                            InputProps={{
                                                readOnly: true,
                                                sx: {
                                                    bgcolor: 'rgba(0,0,0,0.2)',
                                                    fontFamily: 'monospace',
                                                },
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
                                            Public-facing URL for compliance documentation
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Card sx={{
                                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                                    border: '1px solid rgba(102, 126, 234, 0.2)',
                                }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Share sx={{ color: '#667eea' }} />
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                Shared Documents
                                            </Typography>
                                        </Box>
                                        <Stack spacing={1}>
                                            <Chip label="SOC 2 Type II Report" icon={<CheckCircle />} sx={{ bgcolor: '#43e97b20', color: '#43e97b' }} />
                                            <Chip label="ISO 27001 Certificate" icon={<CheckCircle />} sx={{ bgcolor: '#43e97b20', color: '#43e97b' }} />
                                            <Chip label="Penetration Test Letter" icon={<CheckCircle />} sx={{ bgcolor: '#43e97b20', color: '#43e97b' }} />
                                            <Chip label="Information Security Policy" icon={<CheckCircle />} sx={{ bgcolor: '#43e97b20', color: '#43e97b' }} />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, p: 3, bgcolor: 'rgba(102, 126, 234, 0.05)', borderRadius: 2, border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                Trust Center Features:
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CheckCircle sx={{ color: '#43e97b', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            NDA-gated document access
                                        </Typography>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CheckCircle sx={{ color: '#43e97b', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Time-limited secure links
                                        </Typography>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CheckCircle sx={{ color: '#43e97b', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Download tracking & audit log
                                        </Typography>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CheckCircle sx={{ color: '#43e97b', fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Watermarked PDFs
                                        </Typography>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    </CardContent>
                </TabPanel>
            </Card>

            {/* Upload Dialog */}
            <Dialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CloudUpload sx={{ color: '#667eea', fontSize: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Upload SOC Report
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Report Type</InputLabel>
                            <Select label="Report Type" defaultValue="">
                                <MenuItem value="soc2-type1">SOC 2 Type I</MenuItem>
                                <MenuItem value="soc2-type2">SOC 2 Type II</MenuItem>
                                <MenuItem value="soc1-type1">SOC 1 Type I</MenuItem>
                                <MenuItem value="soc1-type2">SOC 1 Type II</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Auditing Firm"
                            placeholder="e.g., Deloitte, KPMG, PwC"
                        />

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Report Start Date"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Report End Date"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>

                        <FormControl fullWidth>
                            <InputLabel>Access Control</InputLabel>
                            <Select label="Access Control" defaultValue="nda">
                                <MenuItem value="public">Public</MenuItem>
                                <MenuItem value="nda">NDA Required</MenuItem>
                                <MenuItem value="internal">Internal Only</MenuItem>
                                <MenuItem value="restricted">Restricted</MenuItem>
                            </Select>
                        </FormControl>

                        <Box
                            sx={{
                                border: '2px dashed rgba(102, 126, 234, 0.3)',
                                borderRadius: 2,
                                p: 4,
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                                },
                            }}
                        >
                            <Upload sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Drop PDF file here or click to upload
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                Maximum file size: 10MB
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        startIcon={<Upload />}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' },
                        }}
                    >
                        Upload Report
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Share Dialog */}
            <Dialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Share sx={{ color: '#feca57', fontSize: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Share Report
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedReport && (
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <Box>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                    Sharing: {selectedReport.type}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {selectedReport.fileName}
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                label="Recipient Email"
                                type="email"
                                placeholder="customer@company.com"
                            />

                            <FormControl fullWidth>
                                <InputLabel>Link Expiration</InputLabel>
                                <Select label="Link Expiration" defaultValue="7">
                                    <MenuItem value="1">1 day</MenuItem>
                                    <MenuItem value="7">7 days</MenuItem>
                                    <MenuItem value="30">30 days</MenuItem>
                                    <MenuItem value="90">90 days</MenuItem>
                                </Select>
                            </FormControl>

                            <Box sx={{
                                p: 2,
                                bgcolor: 'rgba(254, 202, 87, 0.05)',
                                borderRadius: 1,
                                border: '1px solid rgba(254, 202, 87, 0.2)',
                            }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    <strong>Note:</strong> Recipient will receive a secure link with:
                                </Typography>
                                <Stack spacing={0.5} sx={{ mt: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        • Watermarked PDF with recipient email
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        • Download tracking enabled
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        • Time-limited access
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        startIcon={<LinkIcon />}
                        sx={{
                            background: 'linear-gradient(135deg, #feca57 0%, #fa709a 100%)',
                            color: '#000',
                            fontWeight: 600,
                        }}
                    >
                        Generate Secure Link
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}








