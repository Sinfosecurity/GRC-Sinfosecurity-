import { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Button,
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
    Edit,
    Delete,
    PersonAdd,
    AdminPanelSettings,
    Security,
    Visibility,
    VerifiedUser,
    SupervisorAccount,
    ManageAccounts,
    Assessment,
    // Groups,
    Create,
} from '@mui/icons-material';

// Enhanced organization roles (8 roles)
const roles = [
    'ORG_OWNER',
    'ORG_ADMIN',
    'COMPLIANCE_MANAGER',
    'RISK_MANAGER',
    'AUDITOR',
    'DEPARTMENT_MANAGER',
    'CONTRIBUTOR',
    'VIEWER',
];

const roleIcons: Record<string, JSX.Element> = {
    ORG_OWNER: <SupervisorAccount sx={{ color: '#f5576c' }} />,
    ORG_ADMIN: <AdminPanelSettings sx={{ color: '#f5576c' }} />,
    COMPLIANCE_MANAGER: <VerifiedUser sx={{ color: '#667eea' }} />,
    RISK_MANAGER: <Assessment sx={{ color: '#667eea' }} />,
    AUDITOR: <Security sx={{ color: '#43e97b' }} />,
    DEPARTMENT_MANAGER: <ManageAccounts sx={{ color: '#feca57' }} />,
    CONTRIBUTOR: <Create sx={{ color: '#43e97b' }} />,
    VIEWER: <Visibility sx={{ color: '#feca57' }} />,
};

const roleColors: Record<string, string> = {
    ORG_OWNER: '#f5576c',
    ORG_ADMIN: '#f5576c',
    COMPLIANCE_MANAGER: '#667eea',
    RISK_MANAGER: '#667eea',
    AUDITOR: '#43e97b',
    DEPARTMENT_MANAGER: '#feca57',
    CONTRIBUTOR: '#43e97b',
    VIEWER: '#feca57',
};

const roleDescriptions: Record<string, string> = {
    ORG_OWNER: 'Full control including billing and organization management',
    ORG_ADMIN: 'User management and settings (no billing access)',
    COMPLIANCE_MANAGER: 'Full GRC operations and compliance management',
    RISK_MANAGER: 'Risk assessment, incident management, and controls',
    AUDITOR: 'Read-only access to all modules with export capability',
    DEPARTMENT_MANAGER: 'Manage assigned tasks within department',
    CONTRIBUTOR: 'Create and edit assigned items',
    VIEWER: 'Read-only access to dashboards and reports',
};

// Mock user data with 8 roles
const initialUsers = [
    {
        id: 'user_1',
        name: 'Organization Owner',
        email: 'owner@sinfosecurity.com',
        role: 'ORG_OWNER',
        department: 'Executive',
        status: 'active',
        lastLogin: '1 hour ago',
    },
    {
        id: 'user_2',
        name: 'Admin User',
        email: 'admin@sinfosecurity.com',
        role: 'ORG_ADMIN',
        department: 'IT',
        status: 'active',
        lastLogin: '2 hours ago',
    },
    {
        id: 'user_3',
        name: 'Compliance Manager',
        email: 'compliance@sinfosecurity.com',
        role: 'COMPLIANCE_MANAGER',
        department: 'Compliance',
        status: 'active',
        lastLogin: '1 day ago',
    },
    {
        id: 'user_4',
        name: 'Risk Manager',
        email: 'risk@sinfosecurity.com',
        role: 'RISK_MANAGER',
        department: 'Risk',
        status: 'active',
        lastLogin: '3 days ago',
    },
    {
        id: 'user_5',
        name: 'Internal Auditor',
        email: 'auditor@sinfosecurity.com',
        role: 'AUDITOR',
        department: 'Audit',
        status: 'active',
        lastLogin: '5 days ago',
    },
    {
        id: 'user_6',
        name: 'Department Manager',
        email: 'dept.manager@sinfosecurity.com',
        role: 'DEPARTMENT_MANAGER',
        department: 'Finance',
        status: 'active',
        lastLogin: '2 days ago',
    },
    {
        id: 'user_7',
        name: 'Team Contributor',
        email: 'contributor@sinfosecurity.com',
        role: 'CONTRIBUTOR',
        department: 'Operations',
        status: 'active',
        lastLogin: '1 day ago',
    },
    {
        id: 'user_8',
        name: 'Executive Viewer',
        email: 'viewer@sinfosecurity.com',
        role: 'VIEWER',
        department: 'Executive',
        status: 'active',
        lastLogin: 'Never',
    },
];

export default function UserManagement() {
    const [users] = useState(initialUsers);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('VIEWER');
    const [newUserDepartment, setNewUserDepartment] = useState('');

    const handleInviteUser = () => {
        if (newUserEmail) {
            console.log(`Inviting ${newUserEmail} as ${newUserRole}`);
            alert(`Invitation sent to ${newUserEmail} as ${newUserRole}`);
            setInviteDialogOpen(false);
            setNewUserEmail('');
            setNewUserRole('VIEWER');
            setNewUserDepartment('');
        }
    };

    const stats = [
        {
            title: 'Total Users',
            value: users.length,
            icon: <AdminPanelSettings />,
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        {
            title: 'Active Users',
            value: users.filter(u => u.status === 'active').length,
            icon: <VerifiedUser />,
            color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        },
        {
            title: 'Admins',
            value: users.filter(u => u.role === 'ADMIN').length,
            icon: <Security />,
            color: 'linear-gradient(135deg, #f5576c 0%, #fa709a 100%)',
        },
        {
            title: 'Pending Invites',
            value: 0,
            icon: <PersonAdd />,
            color: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        User Management
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Manage users, roles, and permissions
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => setInviteDialogOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        },
                    }}
                >
                    Invite User
                </Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat) => (
                    <Grid item xs={12} sm={6} md={3} key={stat.title}>
                        <Card
                            sx={{
                                bgcolor: '#1a1f3a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: stat.color,
                                }}
                            />
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                            {stat.title}
                                        </Typography>
                                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            background: stat.color,
                                            p: 2,
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {stat.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Users Table */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        All Users
                    </Typography>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        User
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Role
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Department
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        Last Login
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
                                {users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Box>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {user.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {roleIcons[user.role]}
                                                <Chip
                                                    label={user.role.replace('_', ' ')}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${roleColors[user.role]}20`,
                                                        color: roleColors[user.role],
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {user.department}
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            {user.lastLogin}
                                        </TableCell>
                                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <Chip
                                                label={user.status}
                                                size="small"
                                                sx={{
                                                    bgcolor: user.status === 'active' ? '#43e97b20' : '#f5576c20',
                                                    color: user.status === 'active' ? '#43e97b' : '#f5576c',
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
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

            {/* Invite User Dialog */}
            <Dialog
                open={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAdd sx={{ color: '#667eea' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Invite New User
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="user@company.com"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={newUserRole}
                                label="Role"
                                onChange={(e) => setNewUserRole(e.target.value)}
                            >
                                {roles.map((role) => (
                                    <MenuItem key={role} value={role}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {roleIcons[role]}
                                            <Box>
                                                <Typography sx={{ fontWeight: 600 }}>
                                                    {role.replace(/_/g, ' ')}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                                    {roleDescriptions[role]}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Department (Optional)"
                            value={newUserDepartment}
                            onChange={(e) => setNewUserDepartment(e.target.value)}
                            placeholder="e.g., IT, Compliance, Finance"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleInviteUser}
                        disabled={!newUserEmail}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                            },
                        }}
                    >
                        Send Invitation
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
