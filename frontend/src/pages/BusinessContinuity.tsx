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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Business,
    Schedule,
    Speed,
    CheckCircle,
    Add,
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
    const [processes, setProcesses] = useState(mockProcesses);
    const [openDialog, setOpenDialog] = useState(false);
    const [newProcess, setNewProcess] = useState({
        name: '',
        owner: '',
        criticalityLevel: 'medium',
        rto: '',
        rpo: '',
        financialImpact: '',
    });

    const getCriticalityColor = (level: string) => {
        const colors: Record<string, string> = {
            critical: '#f5576c',
            high: '#ff9800',
            medium: '#feca57',
            low: '#43e97b',
        };
        return colors[level] || '#667eea';
    };

    const handleCreateProcess = () => {
        if (newProcess.name && newProcess.owner && newProcess.rto && newProcess.rpo && newProcess.financialImpact) {
            const process = {
                id: `bp_${processes.length + 1}`,
                name: newProcess.name,
                owner: newProcess.owner,
                criticalityLevel: newProcess.criticalityLevel,
                rto: parseFloat(newProcess.rto),
                rpo: parseFloat(newProcess.rpo),
                financialImpact: parseFloat(newProcess.financialImpact),
                lastTested: new Date().toISOString().split('T')[0],
            };
            
            setProcesses([...processes, process]);
            setOpenDialog(false);
            setNewProcess({
                name: '',
                owner: '',
                criticalityLevel: 'medium',
                rto: '',
                rpo: '',
                financialImpact: '',
            });
            
            alert(`Business process "${newProcess.name}" created successfully!`);
        }
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
                            startIcon={<Add />}
                            onClick={() => setOpenDialog(true)}
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

            {/* New Process Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
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
                        <Business sx={{ color: '#667eea', fontSize: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Add Critical Business Process
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Process Name"
                                value={newProcess.name}
                                onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                                placeholder="e.g., Customer Payment Processing"
                                required
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Process Owner"
                                value={newProcess.owner}
                                onChange={(e) => setNewProcess({ ...newProcess, owner: e.target.value })}
                                placeholder="e.g., Finance Director"
                                required
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Criticality Level</InputLabel>
                                <Select
                                    value={newProcess.criticalityLevel}
                                    label="Criticality Level"
                                    onChange={(e) => setNewProcess({ ...newProcess, criticalityLevel: e.target.value })}
                                >
                                    <MenuItem value="critical">
                                        <Chip
                                            label="CRITICAL"
                                            size="small"
                                            sx={{
                                                bgcolor: '#f5576c20',
                                                color: '#f5576c',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </MenuItem>
                                    <MenuItem value="high">
                                        <Chip
                                            label="HIGH"
                                            size="small"
                                            sx={{
                                                bgcolor: '#ff980020',
                                                color: '#ff9800',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </MenuItem>
                                    <MenuItem value="medium">
                                        <Chip
                                            label="MEDIUM"
                                            size="small"
                                            sx={{
                                                bgcolor: '#feca5720',
                                                color: '#feca57',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </MenuItem>
                                    <MenuItem value="low">
                                        <Chip
                                            label="LOW"
                                            size="small"
                                            sx={{
                                                bgcolor: '#43e97b20',
                                                color: '#43e97b',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="RTO (Recovery Time Objective)"
                                type="number"
                                value={newProcess.rto}
                                onChange={(e) => setNewProcess({ ...newProcess, rto: e.target.value })}
                                placeholder="Hours"
                                helperText="Max acceptable downtime"
                                required
                                InputProps={{
                                    endAdornment: <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>hours</Typography>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="RPO (Recovery Point Objective)"
                                type="number"
                                value={newProcess.rpo}
                                onChange={(e) => setNewProcess({ ...newProcess, rpo: e.target.value })}
                                placeholder="Hours"
                                helperText="Max acceptable data loss"
                                required
                                InputProps={{
                                    endAdornment: <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>hours</Typography>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Financial Impact"
                                type="number"
                                value={newProcess.financialImpact}
                                onChange={(e) => setNewProcess({ ...newProcess, financialImpact: e.target.value })}
                                placeholder="Per hour"
                                helperText="Cost per hour of downtime"
                                required
                                InputProps={{
                                    startAdornment: <Typography sx={{ color: 'rgba(255,255,255,0.5)', mr: 0.5 }}>$</Typography>,
                                    endAdornment: <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>/hr</Typography>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{
                                p: 2,
                                bgcolor: 'rgba(102, 126, 234, 0.05)',
                                borderRadius: 1,
                                border: '1px solid rgba(102, 126, 234, 0.2)',
                            }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 1 }}>
                                    <strong>Definitions:</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                                    • <strong>RTO:</strong> Maximum acceptable time to restore the process after disruption
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                                    • <strong>RPO:</strong> Maximum acceptable amount of data loss measured in time
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                                    • <strong>Criticality:</strong> Impact level on business operations if process fails
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setOpenDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateProcess}
                        disabled={!newProcess.name || !newProcess.owner || !newProcess.rto || !newProcess.rpo || !newProcess.financialImpact}
                        startIcon={<Add />}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                            },
                        }}
                    >
                        Create Process
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
