import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography, Avatar, Stack } from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Assessment as RiskIcon,
    Shield as ControlsIcon,
    Warning as IncidentIcon,
    Description as PolicyIcon,
    Settings as SettingsIcon,
    Business as OrgIcon,
    History as ActivityIcon,
    People as UserIcon,
    Analytics as AnalyticsIcon,
    Assignment as TaskIcon,
    AccountTree as WorkflowIcon,
    Timeline as PredictiveIcon,
    Assessment as ReportIcon,
    Store as VendorIcon,
} from '@mui/icons-material';

const drawerWidth = 280;

const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, color: '#6366f1' },
    { text: 'Vendors', path: '/vendor-management', icon: <VendorIcon />, color: '#14b8a6' },
    { text: 'Assessments', path: '/assessments', icon: <RiskIcon />, color: '#06b6d4' },
    { text: 'Findings', path: '/findings', icon: <IncidentIcon />, color: '#ef4444' },
    { text: 'Monitoring', path: '/monitoring', icon: <PredictiveIcon />, color: '#f59e0b' },
    { text: 'Reports', path: '/reports', icon: <ReportIcon />, color: '#94a3b8' },
    { text: 'Tasks', path: '/tasks', icon: <TaskIcon />, color: '#f59e0b' },
];

const adminItems = [
    { text: 'Organization', path: '/organization-settings', icon: <OrgIcon />, color: '#64748b' },
    { text: 'Users & Roles', path: '/user-management', icon: <UserIcon />, color: '#f43f5e' },
    { text: 'Questionnaires', path: '/questionnaires', icon: <PolicyIcon />, color: '#06b6d4' },
    { text: 'Integrations', path: '/integrations', icon: <WorkflowIcon />, color: '#10b981' },
    { text: 'Billing', path: '/billing', icon: <AnalyticsIcon />, color: '#3b82f6' },
    { text: 'Audit Log', path: '/activity-log', icon: <ActivityIcon />, color: '#64748b' },
    { text: 'Security', path: '/settings', icon: <SettingsIcon />, color: '#8b5cf6' },
];

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Sidebar */}
            <Box
                component="nav"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    overflowY: 'auto',
                    '::-webkit-scrollbar': { width: '4px' },
                }}
            >
                {/* Logo */}
                <Box sx={{ p: 4, mb: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.5)'
                        }}>
                            <ControlsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
                                Supreme Risk
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                Third-party risk
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Navigation */}
                <List sx={{ flex: 1, px: 2, py: 1 }}>
                    <Typography variant="overline" sx={{ px: 2, mb: 1, display: 'block', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        Main Menu
                    </Typography>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItem
                                key={item.text}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    mb: 0.5,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: isActive ? `linear-gradient(90deg, ${item.color}20 0%, transparent 100%)` : 'transparent',
                                    borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                                    '&:hover': {
                                        background: 'rgba(255, 255, 255, 0.03)',
                                    },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <ListItemIcon sx={{ color: isActive ? item.color : 'rgba(255,255,255,0.5)', minWidth: 40, transition: 'color 0.2s' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.9rem',
                                        color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                                    }}
                                />
                            </ListItem>
                        );
                    })}
                </List>

                {/* Settings at bottom */}
                <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="overline" sx={{ px: 1, mb: 1, display: 'block', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        System
                    </Typography>
                    <List disablePadding>
                        {adminItems.map((item) => (
                            <ListItem
                                key={item.text}
                                onClick={() => navigate(item.path)}
                                sx={{ borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                            >
                                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.5)', minWidth: 40 }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }} />
                            </ListItem>
                        ))}
                        <ListItem
                            onClick={async () => {
                                await logout();
                                navigate('/login');
                            }}
                            sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                        >
                            <ListItemIcon sx={{ color: 'rgba(255,255,255,0.5)', minWidth: 40 }}><SettingsIcon /></ListItemIcon>
                            <ListItemText
                                primary={user ? `Sign out (${user.email})` : 'Sign out'}
                                primaryTypographyProps={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}
                            />
                        </ListItem>
                    </List>
                </Box>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 4,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    bgcolor: 'transparent',
                    color: 'text.primary',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
