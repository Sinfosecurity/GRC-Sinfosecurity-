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
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, color: '#6366f1' },
    { text: 'Risk Management', path: '/risk-management', icon: <RiskIcon />, color: '#ec4899' },
    { text: 'Compliance', path: '/compliance', icon: <ComplianceIcon />, color: '#10b981' },
    { text: 'Controls', path: '/controls', icon: <ControlsIcon />, color: '#f59e0b' },
    { text: 'Incidents', path: '/incidents', icon: <IncidentIcon />, color: '#ef4444' },
    { text: 'Policies', path: '/policies', icon: <PolicyIcon />, color: '#06b6d4' },
    { text: 'Documents', path: '/documents', icon: <DocumentIcon />, color: '#8b5cf6' },
    { text: 'ISO 27001', path: '/iso27001', icon: <ISOIcon />, color: '#6366f1' },
    { text: 'TISAX', path: '/tisax', icon: <TISAXIcon />, color: '#ec4899' },
    { text: 'SOC Reports', path: '/soc-reports', icon: <ISOIcon />, color: '#10b981' },
    { text: 'Activity Log', path: '/activity-log', icon: <ActivityIcon />, color: '#64748b' },
    { text: 'User Management', path: '/user-management', icon: <UserIcon />, color: '#f43f5e' },
    { text: 'Analytics', path: '/analytics', icon: <AnalyticsIcon />, color: '#3b82f6' },
    { text: 'Tasks', path: '/tasks', icon: <TaskIcon />, color: '#f59e0b' },
    { text: 'Workflows', path: '/workflows', icon: <WorkflowIcon />, color: '#10b981' },
    { text: 'Business Continuity', path: '/business-continuity', icon: <BCPIcon />, color: '#f97316' },
    { text: 'AI Insights', path: '/ai-insights', icon: <AIIcon />, color: '#8b5cf6' },
    { text: 'Predictive Analytics', path: '/predictive-analytics', icon: <PredictiveIcon />, color: '#ec4899' },
    { text: 'Reports', path: '/reports', icon: <ReportIcon />, color: '#94a3b8' },
    { text: 'Vendor Management', path: '/vendor-management', icon: <VendorIcon />, color: '#14b8a6' },
];

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

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
                                Sinfosecurity
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                GRC Platform
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
                        <ListItem
                            onClick={() => navigate('/organization-settings')}
                            sx={{ borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                        >
                            <ListItemIcon sx={{ color: 'rgba(255,255,255,0.5)', minWidth: 40 }}><OrgIcon /></ListItemIcon>
                            <ListItemText primary="Organization" primaryTypographyProps={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }} />
                        </ListItem>
                        <ListItem
                            onClick={() => navigate('/settings')}
                            sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                        >
                            <ListItemIcon sx={{ color: 'rgba(255,255,255,0.5)', minWidth: 40 }}><SettingsIcon /></ListItemIcon>
                            <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }} />
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
