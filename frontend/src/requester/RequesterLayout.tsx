import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { color } from '../design/tokens';

const links = [
    { to: '/request', label: 'Home', end: true },
    { to: '/request/new', label: 'New Request' },
    { to: '/request/my-requests', label: 'My Requests' },
    { to: '/request/actions', label: 'Actions Required' },
    { to: '/request/help', label: 'Help' },
];

export default function RequesterLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: color.workspace, color: color.ink }}>
            <a className="sr-skip" href="#main">Skip to content</a>
            <Box
                component="header"
                sx={{
                    px: { xs: 2, md: 4 },
                    py: 1.5,
                    bgcolor: color.navy950,
                    color: color.navInk,
                    borderBottom: `2px solid ${color.gold}`,
                }}
            >
                <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: color.goldSoft }}>Supreme</Typography>
                        <Typography sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, lineHeight: 1.1 }}>Third-Party Requests</Typography>
                    </Box>
                    <Box component="nav" aria-label="Requester" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                style={({ isActive }) => ({
                                    color: isActive ? color.goldSoft : color.navInk,
                                    textDecoration: 'none',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    padding: '8px 10px',
                                    borderBottom: isActive ? `2px solid ${color.gold}` : '2px solid transparent',
                                })}
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </Box>
                    <Typography
                        component="button"
                        type="button"
                        aria-label="Account menu"
                        aria-haspopup="menu"
                        onClick={(event) => setMenuEl(event.currentTarget)}
                        sx={{ border: 0, bgcolor: 'transparent', color: color.navInk, cursor: 'pointer', font: 'inherit', fontWeight: 700 }}
                    >
                        {user?.firstName || user?.email || 'Account'}
                    </Typography>
                    <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
                        <MenuItem disabled>{user?.email}</MenuItem>
                        <MenuItem onClick={async () => { setMenuEl(null); await logout(); navigate('/login'); }}>Sign out</MenuItem>
                    </Menu>
                </Box>
            </Box>
            <Box component="main" id="main" sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 }, minWidth: 0 }}>
                <Outlet />
            </Box>
            <Box component="footer" sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 3, color: color.inkMuted, fontSize: 13 }}>
                <Link to="/request/help" style={{ color: 'inherit' }}>Help</Link>
            </Box>
        </Box>
    );
}
