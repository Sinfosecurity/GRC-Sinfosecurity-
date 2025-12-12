import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { History, Person, Create, Delete, Update, Visibility } from '@mui/icons-material';

interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    status: string;
    details?: string;
}

const getActionIcon = (action: string) => {
    if (action.includes('create')) return <Create sx={{ fontSize: 18 }} />;
    if (action.includes('delete')) return <Delete sx={{ fontSize: 18 }} />;
    if (action.includes('update')) return <Update sx={{ fontSize: 18 }} />;
    if (action.includes('view')) return <Visibility sx={{ fontSize: 18 }} />;
    return <History sx={{ fontSize: 18 }} />;
};

const getActionColor = (action: string) => {
    if (action.includes('create')) return '#43e97b';
    if (action.includes('delete')) return '#f5576c';
    if (action.includes('update')) return '#00f2fe';
    return '#667eea';
};

export default function ActivityLog() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');
    const [filterResource, setFilterResource] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            // Mock data for now - will connect to API later
            const mockLogs: AuditLog[] = [
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    userId: 'user1',
                    userName: 'John Doe',
                    action: 'create_risk',
                    resourceType: 'Risk',
                    resourceId: 'risk_123',
                    resourceName: 'Data Breach Risk',
                    status: 'success',
                    details: 'Created new risk assessment'
                },
                {
                    id: '2',
                    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                    userId: 'user2',
                    userName: 'Jane Smith',
                    action: 'update_policy',
                    resourceType: 'Policy',
                    resourceId: 'policy_456',
                    resourceName: 'Data Classification Policy',
                    status: 'success',
                    details: 'Updated policy version to 2.2'
                },
                {
                    id: '3',
                    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                    userId: 'user3',
                    userName: 'Mike Johnson',
                    action: 'create_incident',
                    resourceType: 'Incident',
                    resourceId: 'inc_789',
                    resourceName: 'Phishing Email Detection',
                    status: 'success',
                    details: 'Reported new security incident'
                },
                {
                    id: '4',
                    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                    userId: 'user1',
                    userName: 'John Doe',
                    action: 'delete_document',
                    resourceType: 'Document',
                    resourceId: 'doc_321',
                    resourceName: 'Old Audit Report',
                    status: 'success',
                    details: 'Deleted outdated document'
                },
                {
                    id: '5',
                    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                    userId: 'user2',
                    userName: 'Jane Smith',
                    action: 'update_control',
                    resourceType: 'Control',
                    resourceId: 'ctrl_555',
                    resourceName: 'Multi-Factor Authentication',
                    status: 'success',
                    details: 'Updated control effectiveness rating'
                }
            ];

            setLogs(mockLogs);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesAction = filterAction === 'all' || log.action.includes(filterAction);
        const matchesResource = filterResource === 'all' || log.resourceType === filterResource;
        const matchesSearch = !searchTerm ||
            log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesAction && matchesResource && matchesSearch;
    });

    const stats = {
        total: logs.length,
        last24h: logs.filter(l => new Date(l.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
        uniqueUsers: new Set(logs.map(l => l.userId)).size,
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Activity Log
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Complete audit trail of all system activities
                    </Typography>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                                {stats.total}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Total Activities
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#00f2fe', fontWeight: 700 }}>
                                {stats.last24h}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Last 24 Hours
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                                {stats.uniqueUsers}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Active Users
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by user, resource, or description..."
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Action Type</InputLabel>
                                <Select
                                    value={filterAction}
                                    onChange={(e) => setFilterAction(e.target.value)}
                                    label="Action Type"
                                >
                                    <MenuItem value="all">All Actions</MenuItem>
                                    <MenuItem value="create">Create</MenuItem>
                                    <MenuItem value="update">Update</MenuItem>
                                    <MenuItem value="delete">Delete</MenuItem>
                                    <MenuItem value="view">View</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Resource Type</InputLabel>
                                <Select
                                    value={filterResource}
                                    onChange={(e) => setFilterResource(e.target.value)}
                                    label="Resource Type"
                                >
                                    <MenuItem value="all">All Resources</MenuItem>
                                    <MenuItem value="Risk">Risks</MenuItem>
                                    <MenuItem value="Policy">Policies</MenuItem>
                                    <MenuItem value="Incident">Incidents</MenuItem>
                                    <MenuItem value="Document">Documents</MenuItem>
                                    <MenuItem value="Control">Controls</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Activity Log Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Activity Timeline
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Timestamp</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>User</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Action</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Resource</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Details</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', py: 4 }}>
                                            Loading activity logs...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', py: 4 }}>
                                            No activities found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow
                                            key={log.id}
                                            sx={{
                                                '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' },
                                            }}
                                        >
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Person sx={{ color: '#667eea', fontSize: 20 }} />
                                                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                                        {log.userName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ color: getActionColor(log.action) }}>
                                                        {getActionIcon(log.action)}
                                                    </Box>
                                                    <Chip
                                                        label={log.action.replace('_', ' ').toUpperCase()}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: `${getActionColor(log.action)}20`,
                                                            color: getActionColor(log.action),
                                                            fontWeight: 600
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                                        {log.resourceName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                        {log.resourceType}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                {log.details}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.status}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: log.status === 'success' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(245, 87, 108, 0.2)',
                                                        color: log.status === 'success' ? '#43e97b' : '#f5576c',
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
