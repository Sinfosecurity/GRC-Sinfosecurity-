import { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    Assignment,
    CheckCircle,
    AccessTime,
    Warning,
    Edit,
    Delete,
    PlayArrow,
} from '@mui/icons-material';

// Mock workflow data
const mockWorkflows = [
    {
        id: 'wf_1',
        name: 'Quarterly Risk Assessment',
        description: 'Automated quarterly risk assessment workflow',
        type: 'scheduled',
        status: 'active',
        steps: 2,
        lastExecuted: '2024-12-01',
        nextExecution: '2025-03-01',
    },
    {
        id: 'wf_2',
        name: 'Incident Remediation',
        description: 'Standard workflow for high/critical incident remediation',
        type: 'automated',
        status: 'active',
        steps: 4,
        lastExecuted: '2024-12-10',
        nextExecution: 'Event-triggered',
    },
    {
        id: 'wf_3',
        name: 'Policy Review Cycle',
        description: 'Annual policy review and approval workflow',
        type: 'scheduled',
        status: 'draft',
        steps: 5,
        lastExecuted: 'Never',
        nextExecution: '2025-01-15',
    },
];

export default function WorkflowBuilder() {
    const [workflows, setWorkflows] = useState(mockWorkflows);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#43e97b';
            case 'inactive': return '#f5576c';
            case 'draft': return '#feca57';
            default: return '#667eea';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'manual': return <Assignment />;
            case 'automated': return <CheckCircle />;
            case 'scheduled': return <AccessTime />;
            default: return <Warning />;
        }
    };

    const handleExecuteWorkflow = (workflowId: string) => {
        console.log('Executing workflow:', workflowId);
        // In production, call API to execute workflow
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Workflow Automation
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Automate task assignment, escalations, and recurring processes
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Assignment />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        },
                    }}
                >
                    Create Workflow
                </Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                        Total Workflows
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {workflows.length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#667eea20', p: 2, borderRadius: 2 }}>
                                    <Assignment sx={{ color: '#667eea' }} />
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
                                        Active
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {workflows.filter(w => w.status === 'active').length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#43e97b20', p: 2, borderRadius: 2 }}>
                                    <CheckCircle sx={{ color: '#43e97b' }} />
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
                                        Scheduled
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {workflows.filter(w => w.type === 'scheduled').length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#feca5720', p: 2, borderRadius: 2 }}>
                                    <AccessTime sx={{ color: '#feca57' }} />
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
                                        Draft
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {workflows.filter(w => w.status === 'draft').length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#f5576c20', p: 2, borderRadius: 2 }}>
                                    <Warning sx={{ color: '#f5576c' }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Workflows Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        All Workflows
                    </Typography>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Workflow Name
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Type
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Status
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Steps
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Last Executed
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Next Execution
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {workflows.map((workflow) => (
                                    <TableRow key={workflow.id} hover>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Box>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {workflow.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                    {workflow.description}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {getTypeIcon(workflow.type)}
                                                <Typography variant="body2">{workflow.type}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Chip
                                                label={workflow.status}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getStatusColor(workflow.status)}20`,
                                                    color: getStatusColor(workflow.status),
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {workflow.steps} steps
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {workflow.lastExecuted}
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {workflow.nextExecution}
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <IconButton
                                                size="small"
                                                sx={{ color: '#43e97b' }}
                                                onClick={() => handleExecuteWorkflow(workflow.id)}
                                            >
                                                <PlayArrow fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" sx={{ color: '#667eea' }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" sx={{ color: '#f5576c' }}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create Workflow Dialog (Simplified) */}
            <Dialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' } }}
            >
                <DialogTitle>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Create New Workflow
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <TextField fullWidth label="Workflow Name" placeholder="e.g., Monthly Compliance Review" />
                        <TextField fullWidth multiline rows={3} label="Description" />
                        <FormControl fullWidth>
                            <InputLabel>Workflow Type</InputLabel>
                            <Select defaultValue="manual" label="Workflow Type">
                                <MenuItem value="manual">Manual</MenuItem>
                                <MenuItem value="automated">Automated</MenuItem>
                                <MenuItem value="scheduled">Scheduled</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' },
                        }}
                    >
                        Create Workflow
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
