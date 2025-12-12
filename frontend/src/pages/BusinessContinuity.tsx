import { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    LinearProgress,
} from '@mui/material';
import {
    Business,
    Schedule,
    Speed,
    CheckCircle,
} from '@mui/icons-material';

// Mock data
const mockProcesses = [
    {
        id: 'bp_1',
        name: 'Customer Payment Processing',
        owner: 'Finance Director',
        criticalityLevel: 'critical',
        rto: 2,
        rpo: 1,
        financialImpact: 50000,
        lastTested: '2024-11-15',
    },
    {
        id: 'bp_2',
        name: 'Data Backup Systems',
        owner: 'IT Director',
        criticalityLevel: 'high',
        rto: 4,
        rpo: 2,
        financialImpact: 25000,
        lastTested: '2024-10-20',
    },
];

export default function BusinessContinuity() {
    const [processes] = useState(mockProcesses);

    const getCriticalityColor = (level: string) => {
        const colors: Record<string, string> = {
            critical: '#f5576c',
            high: '#ff9800',
            medium: '#feca57',
            low: '#43e97b',
        };
        return colors[level] || '#667eea';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Business Continuity Planning
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Manage business impact analysis, recovery plans, and RTO/RPO tracking
                </Typography>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                        Critical Processes
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {processes.filter(p => p.criticalityLevel === 'critical').length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#f5576c20', p: 2, borderRadius: 2 }}>
                                    <Business sx={{ color: '#f5576c' }} />
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
                                        Avg RTO
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {(processes.reduce((sum, p) => sum + p.rto, 0) / processes.length).toFixed(1)}h
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#667eea20', p: 2, borderRadius: 2 }}>
                                    <Speed sx={{ color: '#667eea' }} />
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
                                        Avg RPO
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {(processes.reduce((sum, p) => sum + p.rpo, 0) / processes.length).toFixed(1)}h
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#feca5720', p: 2, borderRadius: 2 }}>
                                    <Schedule sx={{ color: '#feca57' }} />
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
                                        Plans Tested
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        100%
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#43e97b20', p: 2, borderRadius: 2 }}>
                                    <CheckCircle sx={{ color: '#43e97b' }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Business Processes Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Critical Business Processes
                        </Typography>
                        <Button
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' },
                            }}
                        >
                            New Process
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Process Name
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Owner
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Criticality
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        RTO
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        RPO
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Financial Impact
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Last Tested
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {processes.map((process) => (
                                    <TableRow key={process.id} hover>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {process.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {process.owner}
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Chip
                                                label={process.criticalityLevel.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getCriticalityColor(process.criticalityLevel)}20`,
                                                    color: getCriticalityColor(process.criticalityLevel),
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {process.rto} hours
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {process.rpo} hours
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            ${(process.financialImpact / 1000)}k/hr
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {process.lastTested}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
