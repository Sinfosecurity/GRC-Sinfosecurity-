import { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import { Download, PictureAsPdf, TableChart, Assessment } from '@mui/icons-material';

interface Report {
    id: number;
    name: string;
    type: string;
    description: string;
    lastGenerated: string;
    frequency: string;
}

const reportTemplates: Report[] = [
    {
        id: 1,
        name: 'Executive Compliance Summary',
        type: 'Executive',
        description: 'High-level compliance posture for leadership',
        lastGenerated: '2024-12-10',
        frequency: 'Monthly'
    },
    {
        id: 2,
        name: 'Risk Assessment Report',
        type: 'Risk',
        description: 'Detailed risk analysis and trends',
        lastGenerated: '2024-12-08',
        frequency: 'Quarterly'
    },
    {
        id: 3,
        name: 'Control Effectiveness Report',
        type: 'Controls',
        description: 'Control maturity and testing results',
        lastGenerated: '2024-12-05',
        frequency: 'Quarterly'
    },
    {
        id: 4,
        name: 'Vendor Risk Assessment',
        type: 'Vendor',
        description: 'Third-party risk summary',
        lastGenerated: '2024-12-01',
        frequency: 'Monthly'
    },
    {
        id: 5,
        name: 'Incident Response Summary',
        type: 'Incident',
        description: 'Security incidents and response metrics',
        lastGenerated: '2024-12-12',
        frequency: 'Weekly'
    },
    {
        id: 6,
        name: 'Audit Readiness Report',
        type: 'Audit',
        description: 'Comprehensive audit preparation',
        lastGenerated: '2024-11-30',
        frequency: 'On-Demand'
    }
];

const reportTypes = ['All', 'Executive', 'Risk', 'Controls', 'Vendor', 'Incident', 'Audit'];
// const frequencies = ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'On-Demand'];
const formats = ['PDF', 'Excel', 'CSV', 'HTML'];

const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
        'Executive': '#667eea',
        'Risk': '#f5576c',
        'Controls': '#43e97b',
        'Vendor': '#00f2fe',
        'Incident': '#fa709a',
        'Audit': '#fee140'
    };
    return colors[type] || '#667eea';
};

export default function Reports() {
    const [filterType, setFilterType] = useState('All');
    const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [generateConfig, setGenerateConfig] = useState({
        format: 'PDF',
        dateRange: '30',
        includeCharts: true,
        includeDetails: true
    });

    const filteredReports = reportTemplates.filter(
        report => filterType === 'All' || report.type === filterType
    );

    const handleGenerateReport = (report: Report) => {
        setSelectedReport(report);
        setOpenGenerateDialog(true);
    };

    const handleConfirmGenerate = () => {
        // In production, this would call the API to generate the report
        console.log('Generating report:', selectedReport?.name, 'with config:', generateConfig);
        setOpenGenerateDialog(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Reports & Analytics
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Generate compliance and risk reports
                    </Typography>
                </Box>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Filter by Type</InputLabel>
                    <Select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        label="Filter by Type"
                    >
                        {reportTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Report Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                                {reportTemplates.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Report Templates
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                                24
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Reports This Month
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#00f2fe', fontWeight: 700 }}>
                                5
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Scheduled Reports
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#fee140', fontWeight: 700 }}>
                                3
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Pending Generation
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Report Templates Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {filteredReports.map((report) => (
                    <Grid item xs={12} md={6} key={report.id}>
                        <Card sx={{
                            bgcolor: '#1a1f3a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            '&:hover': {
                                borderColor: getTypeColor(report.type),
                                transform: 'translateY(-2px)',
                                transition: 'all 0.3s'
                            }
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            {report.name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                                            {report.description}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={report.type}
                                        size="small"
                                        sx={{
                                            bgcolor: `${getTypeColor(report.type)}20`,
                                            color: getTypeColor(report.type),
                                            fontWeight: 600,
                                            ml: 2
                                        }}
                                    />
                                </Box>

                                <Grid container spacing={1} sx={{ mb: 2 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                            Last Generated
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'white' }}>
                                            {report.lastGenerated}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                            Frequency
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'white' }}>
                                            {report.frequency}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<Assessment />}
                                        onClick={() => handleGenerateReport(report)}
                                        sx={{
                                            flex: 1,
                                            background: `linear-gradient(135deg, ${getTypeColor(report.type)} 0%, ${getTypeColor(report.type)}99 100%)`,
                                            '&:hover': {
                                                background: `linear-gradient(135deg, ${getTypeColor(report.type)}99 0%, ${getTypeColor(report.type)} 100%)`,
                                            }
                                        }}
                                    >
                                        Generate
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Download />}
                                        sx={{
                                            borderColor: 'rgba(255,255,255,0.3)',
                                            color: 'white',
                                            '&:hover': {
                                                borderColor: getTypeColor(report.type),
                                                bgcolor: `${getTypeColor(report.type)}10`
                                            }
                                        }}
                                    >
                                        Download Latest
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Recent Reports Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Recently Generated Reports
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Report Name</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Generated</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Format</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportTemplates.slice(0, 5).map((report) => (
                                    <TableRow
                                        key={report.id}
                                        sx={{ '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' } }}
                                    >
                                        <TableCell sx={{ color: 'white' }}>{report.name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={report.type}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getTypeColor(report.type)}20`,
                                                    color: getTypeColor(report.type)
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            {report.lastGenerated}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label="PDF"
                                                size="small"
                                                icon={<PictureAsPdf />}
                                                sx={{ bgcolor: 'rgba(245, 87, 108, 0.2)', color: '#f5576c' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                startIcon={<Download />}
                                                sx={{ color: '#43e97b' }}
                                            >
                                                Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Generate Report Dialog */}
            <Dialog
                open={openGenerateDialog}
                onClose={() => setOpenGenerateDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment sx={{ color: '#667eea' }} />
                        Generate Report
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedReport && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 3 }}>
                                <strong>{selectedReport.name}</strong>
                                <br />
                                {selectedReport.description}
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Output Format</InputLabel>
                                        <Select
                                            value={generateConfig.format}
                                            onChange={(e) => setGenerateConfig({ ...generateConfig, format: e.target.value })}
                                            label="Output Format"
                                        >
                                            {formats.map(format => (
                                                <MenuItem key={format} value={format}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {format === 'PDF' && <PictureAsPdf />}
                                                        {format === 'Excel' && <TableChart />}
                                                        {format === 'CSV' && <TableChart />}
                                                        {format}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Date Range</InputLabel>
                                        <Select
                                            value={generateConfig.dateRange}
                                            onChange={(e) => setGenerateConfig({ ...generateConfig, dateRange: e.target.value })}
                                            label="Date Range"
                                        >
                                            <MenuItem value="7">Last 7 Days</MenuItem>
                                            <MenuItem value="30">Last 30 Days</MenuItem>
                                            <MenuItem value="90">Last 90 Days</MenuItem>
                                            <MenuItem value="365">Last Year</MenuItem>
                                            <MenuItem value="custom">Custom Range</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Additional Options
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            label="Include Charts"
                                            onClick={() => setGenerateConfig({
                                                ...generateConfig,
                                                includeCharts: !generateConfig.includeCharts
                                            })}
                                            color={generateConfig.includeCharts ? 'primary' : 'default'}
                                            sx={{
                                                bgcolor: generateConfig.includeCharts ? '#43e97b' : 'rgba(255,255,255,0.1)',
                                                color: generateConfig.includeCharts ? '#000' : '#fff'
                                            }}
                                        />
                                        <Chip
                                            label="Include Details"
                                            onClick={() => setGenerateConfig({
                                                ...generateConfig,
                                                includeDetails: !generateConfig.includeDetails
                                            })}
                                            color={generateConfig.includeDetails ? 'primary' : 'default'}
                                            sx={{
                                                bgcolor: generateConfig.includeDetails ? '#43e97b' : 'rgba(255,255,255,0.1)',
                                                color: generateConfig.includeDetails ? '#000' : '#fff'
                                            }}
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenGenerateDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirmGenerate}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                    >
                        Generate Report
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
