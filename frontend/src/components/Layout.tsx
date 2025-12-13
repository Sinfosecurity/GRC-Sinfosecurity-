import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography, Avatar, Stack } from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Assessment as RiskIcon,
    Verified as ComplianceIcon,
    Shield as ControlsIcon,
    Warning as IncidentIcon,
    Description as PolicyIcon,
    Folder as DocumentIcon,
    Security as ISOIcon,
    DirectionsCar as TISAXIcon,
    Settings as SettingsIcon,
    Business as OrgIcon,
    History as ActivityIcon,
    People as UserIcon,
    Analytics as AnalyticsIcon,
    Assignment as TaskIcon,
    AccountTree as WorkflowIcon,
    Business as BCPIcon,
    Psychology as AIIcon,
    Timeline as PredictiveIcon,
    Assessment as ReportIcon,
    Store as VendorIcon,
} from '@mui/icons-material';

const drawerWidth = 280;

const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, color: '#667eea' },
    { text: 'Risk Management', path: '/risk-management', icon: <RiskIcon />, color: '#f5576c' },
    { text: 'Compliance', path: '/compliance', icon: <ComplianceIcon />, color: '#00f2fe' },
    { text: 'Controls', path: '/controls', icon: <ControlsIcon />, color: '#43e97b' },
    { text: 'Incidents', path: '/incidents', icon: <IncidentIcon />, color: '#fee140' },
    { text: 'Policies', path: '/policies', icon: <PolicyIcon />, color: '#30cfd0' },
    { text: 'Documents', path: '/documents', icon: <DocumentIcon />, color: '#fed6e3' },
    { text: 'ISO 27001', path: '/iso27001', icon: <ISOIcon />, color: '#fecfef' },
    { text: 'TISAX', path: '/tisax', icon: <TISAXIcon />, color: '#fcb69f' },
    { text: 'Activity Log', path: '/activity-log', icon: <ActivityIcon />, color: '#a29bfe' },
    { text: 'User Management', path: '/user-management', icon: <UserIcon />, color: '#fd79a8' },
    { text: 'Analytics', path: '/analytics', icon: <AnalyticsIcon />, color: '#74b9ff' },
    { text: 'Tasks', path: '/tasks', icon: <TaskIcon />, color: '#fab1a0' },
    { text: 'Workflows', path: '/workflows', icon: <WorkflowIcon />, color: '#55efc4' },
    { text: 'Business Continuity', path: '/business-continuity', icon: <BCPIcon />, color: '#ffeaa7' },
    { text: 'AI Insights', path: '/ai-insights', icon: <AIIcon />, color: '#a29bfe' },
    { text: 'Predictive Analytics', path: '/predictive-analytics', icon: <PredictiveIcon />, color: '#fd79a8' },
    { text: 'Reports', path: '/reports', icon: <ReportIcon />, color: '#dfe6e9' },
    { text: 'Vendor Management', path: '/vendor-management', icon: <VendorIcon />, color: '#81ecec' },
];

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Box
                sx={{
                    width: drawerWidth,
                    bgcolor: '#1a1f3a',
                    borderRight: '1px solid rgba(102, 126, 234, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        p: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ width: 48, height: 48, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <ControlsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                                Sinfosecurity
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                GRC Platform
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Navigation */}
                <List sx={{ flex: 1, px: 2, py: 3 }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItem
                                key={item.text}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    mb: 1,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    background: isActive ? `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)` : 'transparent',
                                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                                    '&:hover': {
                                        background: isActive ? `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)` : 'rgba(102, 126, 234, 0.1)',
                                        transform: 'translateX(4px)',
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.95rem',
                                    }}
                                />
                            </ListItem>
                        );
                    })}
                </List>

                {/* Settings at bottom */}
                <List sx={{ px: 2, pb: 2 }}>
                    <ListItem
                        onClick={() => navigate('/organization-settings')}
                        sx={{
                            borderRadius: 2,
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)',
                            mb: 1,
                            '&:hover': {
                                background: 'rgba(102, 126, 234, 0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                            <OrgIcon />
                        </ListItemIcon>
                        <ListItemText primary="Organization" />
                    </ListItem>
                    <ListItem
                        onClick={() => navigate('/settings')}
                        sx={{
                            borderRadius: 2,
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': {
                                background: 'rgba(102, 126, 234, 0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                            <SettingsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItem>
                </List>
            </Box>

            {/* Main Content */}
            <Box
                sx={{
                    flexGrow: 1,
                    p: 4,
                    bgcolor: '#0a0e27',
                    color: 'white',
                    minHeight: '100vh',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
