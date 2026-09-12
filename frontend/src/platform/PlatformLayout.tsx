import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Box, TextField, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { environmentLabel } from '../components/DevPreviewBanner';
import { useEffect, useState } from 'react';
import { platformAPI } from './api';

const NAV = [
    { to: '/platform', label: 'Overview', end: true },
    { to: '/platform/organizations', label: 'Organizations' },
    { to: '/platform/support', label: 'Support' },
    { to: '/platform/incidents', label: 'Incidents' },
    { to: '/platform/leads', label: 'Sales / Demo' },
    { to: '/platform/billing', label: 'Billing' },
    { to: '/platform/providers', label: 'Provider health' },
    { to: '/platform/audit', label: 'Audit' },
    { to: '/platform/users', label: 'Internal users' },
    { to: '/platform/sessions', label: 'Support access' },
];

export default function PlatformLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<{ organizations: Array<{ id: string; name: string }>; tickets: Array<{ id: string; displayId: string }> }>({
        organizations: [],
        tickets: [],
    });
    const staging = environmentLabel() === 'STAGING';

    useEffect(() => {
        if (query.trim().length < 2) {
            setHits({ organizations: [], tickets: [] });
            return;
        }
        const handle = window.setTimeout(() => {
            platformAPI.search(query).then((response) => setHits(response.data.data)).catch(() => undefined);
        }, 250);
        return () => window.clearTimeout(handle);
    }, [query]);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#140f0c', color: '#f3e8dc' }}>
            <Box
                component="nav"
                aria-label="Platform owner navigation"
                sx={{
                    width: 250,
                    flexShrink: 0,
                    borderRight: '1px solid rgba(196,149,92,0.2)',
                    bgcolor: '#1b1410',
                    p: 2.5,
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    overflowY: 'auto',
                }}
            >
                <Typography sx={{ fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 600, color: '#e8c9a0' }}>
                    Supreme Operations
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#c4955c', letterSpacing: '0.12em', mb: 3 }}>
                    {staging ? 'SUPREME RISK — STAGING' : 'INTERNAL CONSOLE'}
                </Typography>
                {NAV.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        style={{ textDecoration: 'none' }}
                    >
                        {({ isActive }) => (
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 1,
                                    mb: 0.5,
                                    borderRadius: 1,
                                    color: isActive ? '#1b1410' : '#e8d7c3',
                                    bgcolor: isActive ? '#c4955c' : 'transparent',
                                    fontSize: 14,
                                    fontWeight: isActive ? 700 : 500,
                                }}
                            >
                                {item.label}
                            </Box>
                        )}
                    </NavLink>
                ))}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="caption" sx={{ color: '#a3856a' }}>
                        Signed in as
                    </Typography>
                    <Typography sx={{ fontSize: 13 }}>{user?.email}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#c4955c' }}>{user?.role}</Typography>
                </Box>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontFamily: 'Newsreader, serif', fontSize: 28 }}>{documentTitle(location.pathname)}</Typography>
                    <TextField
                        size="small"
                        label="Search organizations, tickets, leads"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        sx={{ minWidth: 280, '& .MuiInputBase-root': { bgcolor: '#221910' } }}
                    />
                </Box>
                {hits.organizations.length + hits.tickets.length > 0 && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#221910', borderRadius: 1 }} aria-live="polite">
                        {hits.organizations.map((org) => (
                            <NavLink key={org.id} to={`/platform/organizations/${org.id}`} style={{ color: '#e8c9a0', display: 'block' }}>
                                {org.name}
                            </NavLink>
                        ))}
                        {hits.tickets.map((ticket) => (
                            <NavLink key={ticket.id} to={`/platform/support/${ticket.id}`} style={{ color: '#e8c9a0', display: 'block' }}>
                                {ticket.displayId}
                            </NavLink>
                        ))}
                    </Box>
                )}
                <Outlet />
            </Box>
        </Box>
    );
}

function documentTitle(path: string) {
    if (path.startsWith('/platform/organizations')) return 'Organizations';
    if (path.startsWith('/platform/support')) return 'Support';
    if (path.startsWith('/platform/incidents')) return 'Incidents';
    if (path.startsWith('/platform/leads')) return 'Sales / demo requests';
    if (path.startsWith('/platform/billing')) return 'Billing support';
    if (path.startsWith('/platform/providers')) return 'Provider health';
    if (path.startsWith('/platform/audit')) return 'Platform audit';
    if (path.startsWith('/platform/users')) return 'Internal users';
    if (path.startsWith('/platform/sessions')) return 'Support access';
    return 'Platform overview';
}
