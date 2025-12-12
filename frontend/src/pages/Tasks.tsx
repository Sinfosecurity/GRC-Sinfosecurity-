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
    Tabs,
    Tab,
} from '@mui/material';
import {
    Assignment,
    CheckCircle,
    AccessTime,
    Warning,
    Edit,
    Check,
    Person,
} from '@mui/icons-material';

// Mock task data
const mockTasks = [
    {
        id: 'task_1',
        title: 'Q4 2024 Risk Assessment',
        description: 'Conduct quarterly risk assessment for all critical systems',
        type: 'risk_assessment',
        assignedTo: 'Compliance Officer',
        dueDate: '2024-12-31',
        priority: 'high',
        status: 'in_progress',
    },
    {
        id: 'task_2',
        title: 'ISO 27001 Compliance Review',
        description: 'Review and update ISO 27001 compliance documentation',
        type: 'compliance_review',
        assignedTo: 'Compliance Officer',
        dueDate: '2024-12-20',
        priority: 'high',
        status: 'pending',
    },
    {
        id: 'task_3',
        title: 'Access Control Testing',
        description: 'Test effectiveness of user access controls',
        type: 'control_test',
        assignedTo: 'Internal Auditor',
        dueDate: '2024-12-15',
        priority: 'medium',
        status: 'completed',
    },
    {
        id: 'task_4',
        title: 'Data Breach Incident Remediation',
        description: 'Implement remediation plan for security incident #42',
        type: 'remediation',
        assignedTo: 'Admin User',
        dueDate: '2024-12-14',
        priority: 'critical',
        status: 'in_progress',
    },
    {
        id: 'task_5',
        title: 'Annual Privacy Policy Review',
        description: 'Review and update privacy policy for 2025',
        type: 'policy_review',
        assignedTo: 'Compliance Officer',
        dueDate: '2024-12-01',
        priority: 'medium',
        status: 'completed',
    },
];

export default function Tasks() {
    const [tasks, setTasks] = useState(mockTasks);
    const [tabValue, setTabValue] = useState(0);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return '#f5576c';
            case 'high': return '#ff9800';
            case 'medium': return '#feca57';
            case 'low': return '#43e97b';
            default: return '#667eea';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#43e97b';
            case 'in_progress': return '#667eea';
            case 'pending': return '#feca57';
            case 'blocked': return '#f5576c';
            default: return '#667eea';
        }
    };

    const filterTasks = () => {
        switch (tabValue) {
            case 0: return tasks; // All
            case 1: return tasks.filter(t => t.status === 'pending' || t.status === 'in_progress'); // Active
            case 2: return tasks.filter(t => t.status === 'completed'); // Completed
            case 3: return tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed'); // Overdue
            default: return tasks;
        }
    };

    const filteredTasks = filterTasks();

    const handleCompleteTask = (taskId: string) => {
        console.log('Completing task:', taskId);
        // In production, call API to complete task
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Task Management
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Track and manage all tasks across compliance, risk, and GRC activities
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Assignment />}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        },
                    }}
                >
                    Create Task
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
                                        Total Tasks
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {tasks.length}
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
                                        In Progress
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {tasks.filter(t => t.status === 'in_progress').length}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: '#667eea20', p: 2, borderRadius: 2 }}>
                                    <AccessTime sx={{ color: '#667eea' }} />
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
                                        Completed
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {tasks.filter(t => t.status === 'completed').length}
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
                                        Overdue
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                        {tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length}
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

            {/* Tasks Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    {/* Tabs */}
                    <Tabs
                        value={tabValue}
                        onChange={(e, newValue) => setTabValue(newValue)}
                        sx={{
                            mb: 3,
                            '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)' },
                            '& .Mui-selected': { color: '#667eea' },
                            '& .MuiTabs-indicator': { bgcolor: '#667eea' },
                        }}
                    >
                        <Tab label="All Tasks" />
                        <Tab label="Active" />
                        <Tab label="Completed" />
                        <Tab label="Overdue" />
                    </Tabs>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Task
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Type
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Assigned To
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Due Date
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Priority
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Status
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTasks.map((task) => (
                                    <TableRow key={task.id} hover>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Box>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {task.title}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                    {task.description}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                {task.type.replace('_', ' ')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Person sx={{ fontSize: 18 }} />
                                                {task.assignedTo}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {task.dueDate}
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Chip
                                                label={task.priority}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getPriorityColor(task.priority)}20`,
                                                    color: getPriorityColor(task.priority),
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Chip
                                                label={task.status.replace('_', ' ')}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getStatusColor(task.status)}20`,
                                                    color: getStatusColor(task.status),
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {task.status !== 'completed' && (
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: '#43e97b' }}
                                                    onClick={() => handleCompleteTask(task.id)}
                                                >
                                                    <Check fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton size="small" sx={{ color: '#667eea' }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
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
