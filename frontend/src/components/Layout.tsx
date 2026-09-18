import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Alert,
    Box,
    Button,
    Collapse,
    Drawer,
    IconButton,
    InputBase,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AssessmentOutlined,
    BusinessOutlined,
    CreditCardOutlined,
    DashboardOutlined,
    DescriptionOutlined,
    ExtensionOutlined,
    GavelOutlined,
    HelpOutline,
    AccountTreeOutlined,
    FactCheckOutlined,
    VerifiedUserOutlined,
    GppGoodOutlined,
    WarningAmberOutlined,
    HistoryOutlined,
    HubOutlined,
    InsightsOutlined,
    PlayCircleOutline,
    Menu as MenuIcon,
    MonitorHeartOutlined,
    NotificationsNone,
    PeopleOutlined,
    QuizOutlined,
    ReportProblemOutlined,
    Search,
    SettingsOutlined,
    VpnKeyOutlined,
} from '@mui/icons-material';
import { color } from '../design/tokens';
import { canSeeNav, type NavPermission } from '../security/navAccess';
import { healthCheck, organizationAPI } from '../services/api';

const EXPANDED = 248;
const COLLAPSED = 72;

type NavItem = { text: string; path: string; icon: React.ReactNode; permission: NavPermission };
type NavSection = { title: string; items: NavItem[]; primary?: boolean };

const menuSections: NavSection[] = [
    {
        title: 'Work',
        primary: true,
        items: [
            { text: 'Home', path: '/dashboard', icon: <DashboardOutlined fontSize="small" />, permission: 'always' },
            { text: 'Third Parties', path: '/vendor-management', icon: <BusinessOutlined fontSize="small" />, permission: 'vendor.read' },
            { text: 'Onboard', path: '/vendor-onboarding', icon: <BusinessOutlined fontSize="small" />, permission: 'vendor.read' },
            { text: 'Assessments', path: '/assessments', icon: <AssessmentOutlined fontSize="small" />, permission: 'assessment.read' },
            { text: 'Findings', path: '/findings', icon: <ReportProblemOutlined fontSize="small" />, permission: 'finding.read' },
            { text: 'Decisions', path: '/decision-briefs', icon: <GavelOutlined fontSize="small" />, permission: 'approval.read' },
        ],
    },
    {
        title: 'Programs',
        items: [
            { text: 'Monitoring', path: '/monitoring', icon: <MonitorHeartOutlined fontSize="small" />, permission: 'monitoring.read' },
            { text: 'Risk', path: '/risks', icon: <WarningAmberOutlined fontSize="small" />, permission: 'risk.read' },
            { text: 'Risk register', path: '/risks/register', icon: <ReportProblemOutlined fontSize="small" />, permission: 'risk.read' },
            { text: 'Compliance', path: '/compliance', icon: <VerifiedUserOutlined fontSize="small" />, permission: 'compliance.read' },
            { text: 'Frameworks', path: '/compliance/frameworks', icon: <HubOutlined fontSize="small" />, permission: 'compliance.read' },
            { text: 'Gaps', path: '/compliance/gaps', icon: <ReportProblemOutlined fontSize="small" />, permission: 'compliance.read' },
            { text: 'Privacy', path: '/privacy-ops', icon: <GppGoodOutlined fontSize="small" />, permission: 'privacy.read' },
            { text: 'Activities', path: '/privacy-ops/activities', icon: <HubOutlined fontSize="small" />, permission: 'privacy.read' },
            { text: 'Rights', path: '/privacy-ops/rights', icon: <GppGoodOutlined fontSize="small" />, permission: 'privacy.read' },
            { text: 'Transfers', path: '/privacy-ops/transfers', icon: <HubOutlined fontSize="small" />, permission: 'privacy.read' },
            { text: 'AI Governance', path: '/ai-governance', icon: <HubOutlined fontSize="small" />, permission: 'ai.read' },
            { text: 'AI systems', path: '/ai-governance/systems', icon: <AssessmentOutlined fontSize="small" />, permission: 'ai.read' },
            { text: 'AI approvals', path: '/ai-governance/approvals', icon: <GavelOutlined fontSize="small" />, permission: 'ai.read' },
            { text: 'AI testing', path: '/ai-governance/testing', icon: <FactCheckOutlined fontSize="small" />, permission: 'ai.read' },
        ],
    },
    {
        title: 'Intelligence',
        items: [
            { text: 'Intelligence', path: '/intelligence', icon: <InsightsOutlined fontSize="small" />, permission: 'intelligence.read' },
            { text: 'What changed', path: '/intelligence/changes', icon: <HistoryOutlined fontSize="small" />, permission: 'intelligence.read' },
            { text: 'Executive', path: '/intelligence/executive', icon: <InsightsOutlined fontSize="small" />, permission: 'intelligence.read' },
        ],
    },
    {
        title: 'Automation',
        items: [
            { text: 'Automations', path: '/automation', icon: <PlayCircleOutline fontSize="small" />, permission: 'automation.read' },
            { text: 'Runs', path: '/automation/runs', icon: <HistoryOutlined fontSize="small" />, permission: 'automation.read' },
            { text: 'Templates', path: '/automation/templates', icon: <QuizOutlined fontSize="small" />, permission: 'automation.read' },
        ],
    },
    {
        title: 'Governance',
        items: [
            { text: 'Controls', path: '/control-center', icon: <FactCheckOutlined fontSize="small" />, permission: 'control.read' },
            { text: 'Evidence', path: '/documents', icon: <DescriptionOutlined fontSize="small" />, permission: 'evidence.read' },
            { text: 'Graph', path: '/governance-graph', icon: <AccountTreeOutlined fontSize="small" />, permission: 'governanceGraph.read' },
        ],
    },
    {
        title: 'Reports',
        items: [
            { text: 'Reports', path: '/reports', icon: <DescriptionOutlined fontSize="small" />, permission: 'report.read' },
        ],
    },
    {
        title: 'Administration',
        items: [
            { text: 'Team', path: '/user-management', icon: <PeopleOutlined fontSize="small" />, permission: 'user.manage' },
            { text: 'Identity & Access', path: '/settings/identity', icon: <VpnKeyOutlined fontSize="small" />, permission: 'identity.manage' },
            { text: 'Assessment Library', path: '/questionnaires', icon: <QuizOutlined fontSize="small" />, permission: 'questionnaire.manage' },
            { text: 'API & Integrations', path: '/integrations', icon: <ExtensionOutlined fontSize="small" />, permission: 'integration.manage' },
            { text: 'Billing', path: '/billing', icon: <CreditCardOutlined fontSize="small" />, permission: 'billing.manage' },
            { text: 'Audit', path: '/activity-log', icon: <HistoryOutlined fontSize="small" />, permission: 'audit.read' },
            { text: 'Platform console', path: '/platform', icon: <SettingsOutlined fontSize="small" />, permission: 'platform' },
        ],
    },
];

function environmentCaption() {
    const env = import.meta.env.VITE_ENVIRONMENT;
    if (env === 'private-beta' || env === 'beta') return 'Private testing';
    if (env === 'staging') return 'Staging';
    return 'Development';
}

function NavList({
    collapsed,
    onNavigate,
    role,
    permissions,
    pathname,
    sections,
    openGroups,
    onToggleGroup,
}: {
    collapsed: boolean;
    onNavigate: (path: string) => void;
    role?: string;
    permissions?: string[];
    pathname: string;
    sections: NavSection[];
    openGroups: Record<string, boolean>;
    onToggleGroup: (title: string) => void;
}) {
    return (
        <Box component="div" sx={{ px: collapsed ? 0.75 : 1.25, py: 0.5 }}>
            {sections.map((section) => {
                const items = section.items.filter((item) => canSeeNav(role, item.permission, permissions));
                if (items.length === 0) return null;
                const sectionActive = items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
                const open = Boolean(section.primary || openGroups[section.title] || sectionActive);
                return (
                    <Box key={section.title} sx={{ mb: 1.5 }}>
                        {!collapsed && !section.primary && (
                            <Button
                                onClick={() => onToggleGroup(section.title)}
                                aria-expanded={open}
                                sx={{ px: 1.25, minHeight: 32, color: color.navMuted, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                            >
                                {section.title}
                            </Button>
                        )}
                        {!collapsed && section.primary && (
                            <Typography sx={{ px: 1.25, mb: 0.5, fontSize: 13, color: color.navMuted, fontWeight: 700 }}>
                                {section.title}
                            </Typography>
                        )}
                        <Collapse in={collapsed || open} unmountOnExit={!section.primary}>
                        {items.map((item) => {
                            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                            const button = (
                                <ListItemButton
                                    key={item.text}
                                    onClick={() => onNavigate(item.path)}
                                    selected={isActive}
                                    aria-current={isActive ? 'page' : undefined}
                                    sx={{
                                        mb: 0.25,
                                        borderRadius: '8px',
                                        minHeight: 36,
                                        px: collapsed ? 1 : 1.25,
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        color: isActive ? color.navInk : color.navMuted,
                                        borderLeft: isActive ? `2px solid ${color.gold}` : '2px solid transparent',
                                        '&.Mui-selected': { bgcolor: 'rgba(196,160,86,0.12)', '&:hover': { bgcolor: 'rgba(196,160,86,0.18)' } },
                                        '&:hover': { bgcolor: 'rgba(243,236,222,0.06)' },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32, color: 'inherit', justifyContent: 'center' }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    {!collapsed && (
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: '0.86rem', color: 'inherit' }}
                                        />
                                    )}
                                </ListItemButton>
                            );
                            return collapsed ? <Tooltip key={item.text} title={item.text} placement="right">{button}</Tooltip> : button;
                        })}
                        </Collapse>
                    </Box>
                );
            })}
        </Box>
    );
}

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('supreme.nav.collapsed') === '1');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
    const [orgName, setOrgName] = useState('');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [serviceNotice, setServiceNotice] = useState(false);
    const [lastChecked, setLastChecked] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('supreme.nav.collapsed', collapsed ? '1' : '0');
    }, [collapsed]);

    const refreshServices = () => {
        healthCheck()
            .then(() => {
                setServiceNotice(false);
                setLastChecked(new Date().toLocaleTimeString());
            })
            .catch(() => {
                setServiceNotice(true);
                setLastChecked(new Date().toLocaleTimeString());
            });
    };

    useEffect(() => {
        organizationAPI.getCurrent()
            .then((response) => setOrgName(response.data.data?.name || ''))
            .catch((error) => {
                setOrgName('');
                if (!error?.response) setServiceNotice(true);
            });
        refreshServices();
        const timer = window.setInterval(refreshServices, 45000);
        return () => window.clearInterval(timer);
    }, []);

    const searchable = useMemo(
        () => menuSections.flatMap((section) => section.items).filter((item) => canSeeNav(user?.role, item.permission, user?.permissions)),
        [user]
    );

    const desktopWidth = collapsed ? COLLAPSED : EXPANDED;
    const go = (path: string) => {
        navigate(path);
        setMobileOpen(false);
        setQuery('');
    };

    const sidebar = (isCollapsed: boolean) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', color: color.navInk }}>
            <Box sx={{ px: isCollapsed ? 1 : 2.25, py: 2.25, borderBottom: `1px solid rgba(246,240,228,0.08)` }}>
                <Typography sx={{ fontFamily: '"Newsreader", serif', fontSize: isCollapsed ? 26 : 22, fontWeight: 550, letterSpacing: '-0.02em' }}>
                    {isCollapsed ? 'S' : 'Supreme'}
                </Typography>
                {!isCollapsed && (
                    <Typography sx={{ fontSize: 12, color: color.navMuted, mt: 0.4 }}>
                        Governance · {environmentCaption()}
                    </Typography>
                )}
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <NavList
                    collapsed={isCollapsed}
                    onNavigate={go}
                    role={user?.role}
                    permissions={user?.permissions}
                    pathname={location.pathname}
                    sections={menuSections}
                    openGroups={openGroups}
                    onToggleGroup={(title) => setOpenGroups((current) => ({ ...current, [title]: !current[title] }))}
                />
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <a className="sr-skip" href="#main">Skip to content</a>
            <Box
                component="nav"
                aria-label="Product navigation"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    width: desktopWidth,
                    flexShrink: 0,
                    bgcolor: color.navy950,
                    boxShadow: `inset -1px 0 0 ${color.gold}`,
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    overflow: 'hidden',
                }}
            >
                {sidebar(collapsed)}
            </Box>
            {mobileOpen && (
                <Drawer
                    variant="temporary"
                    open
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    PaperProps={{ 'aria-label': 'Product navigation' }}
                    sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: EXPANDED, bgcolor: color.navy950, border: 'none', boxShadow: `inset -1px 0 0 ${color.gold}` } }}
                >
                    {sidebar(false)}
                </Drawer>
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Box
                    component="header"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: { xs: 1.5, md: 3 },
                        py: 1.25,
                        bgcolor: color.surface,
                        color: color.ink,
                        minHeight: 64,
                        borderBottom: `1px solid ${color.line}`,
                        boxShadow: '0 1px 0 rgba(20,17,14,0.03)',
                    }}
                >
                    <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, color: color.ink }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: color.inkMuted, minWidth: 140, fontWeight: 700 }}>
                        {orgName || 'Organization'}
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: color.surfaceMuted, border: `1px solid ${color.line}`, borderRadius: '10px', px: 1.25, py: 0.65, maxWidth: 520 }}>
                        <Search fontSize="small" sx={{ color: color.inkMuted }} />
                        <InputBase
                            placeholder="Search names and pages"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' || !query.trim()) return;
                                const match = searchable.find((item) => item.text.toLowerCase().includes(query.trim().toLowerCase()));
                                if (match) go(match.path);
                            }}
                            sx={{ color: color.ink, fontSize: 14, width: '100%' }}
                            inputProps={{ 'aria-label': 'Search' }}
                        />
                    </Box>
                    <Tooltip title="Notifications">
                        <IconButton aria-label="Notifications" sx={{ color: color.ink }} onClick={() => navigate('/notifications')}>
                            <NotificationsNone />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Help">
                        <IconButton aria-label="Help" sx={{ color: color.ink }} onClick={() => navigate('/help')}>
                            <HelpOutline />
                        </IconButton>
                    </Tooltip>
                    <Typography
                        component="button"
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={Boolean(menuEl)}
                        aria-label="Account menu"
                        onClick={(event) => setMenuEl(event.currentTarget)}
                        sx={{ border: 0, bgcolor: 'transparent', color: color.ink, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700 }}
                    >
                        {user?.firstName || user?.email || 'Account'}
                    </Typography>
                    <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
                        <MenuItem disabled>{user?.email}</MenuItem>
                        <MenuItem onClick={() => { setMenuEl(null); navigate('/organization-settings'); }}>Organization</MenuItem>
                        <MenuItem onClick={() => { setCollapsed((value) => !value); setMenuEl(null); }}>
                            {collapsed ? 'Expand navigation' : 'Collapse navigation'}
                        </MenuItem>
                        <MenuItem onClick={async () => { setMenuEl(null); await logout(); navigate('/login'); }}>Sign out</MenuItem>
                    </Menu>
                </Box>
                <Box component="main" id="main" sx={{ flexGrow: 1, px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2, md: 2.5 } }}>
                    {serviceNotice && (
                        <Alert
                            severity="warning"
                            sx={{ mb: 2 }}
                            action={<Button color="inherit" size="small" onClick={refreshServices}>Retry</Button>}
                        >
                            Some services are temporarily unavailable.{lastChecked ? ` Last checked ${lastChecked}.` : ''}
                        </Alert>
                    )}
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
