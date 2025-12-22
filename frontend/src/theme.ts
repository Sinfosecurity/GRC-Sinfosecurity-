import { createTheme } from '@mui/material/styles';

// Premium dark theme with vibrant colors
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6366f1', // Indigo, more modern than standard blue
            light: '#818cf8',
            dark: '#4f46e5',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#ec4899', // Pink/Fuchsia for vibrant accents
            light: '#f472b6',
            dark: '#db2777',
            contrastText: '#ffffff',
        },
        success: {
            main: '#10b981', // Emerald
            light: '#34d399',
            dark: '#059669',
        },
        warning: {
            main: '#f59e0b', // Amber
            light: '#fbbf24',
            dark: '#d97706',
        },
        error: {
            main: '#ef4444', // Red
            light: '#f87171',
            dark: '#dc2626',
        },
        background: {
            default: '#0f172a', // Slate 900
            paper: '#1e293b', // Slate 800
        },
        text: {
            primary: '#f8fafc', // Slate 50
            secondary: '#94a3b8', // Slate 400
        },
        action: {
            hover: 'rgba(255, 255, 255, 0.08)',
            selected: 'rgba(99, 102, 241, 0.16)', // Primary transparent
        }
    },
    typography: {
        fontFamily: '"Inter", "Outfit", "Segoe UI", sans-serif',
        h1: {
            fontSize: '3.5rem',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontSize: '2.75rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
        },
        h4: {
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
            letterSpacing: '0.01em',
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: "#4f46e5 #0f172a",
                    "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                        backgroundColor: "#0f172a",
                        width: "8px",
                        height: "8px",
                    },
                    "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
                        borderRadius: 8,
                        backgroundColor: "#4f46e5",
                        minHeight: 24,
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                },
                contained: {
                    boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06)',
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.2), 0 4px 6px -2px rgba(99, 102, 241, 0.1)',
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(30, 41, 59, 0.7)', // Glassy
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                },
            },
        },
    },
});

export default theme;
