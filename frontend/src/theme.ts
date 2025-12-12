import { createTheme } from '@mui/material/styles';

// Premium dark theme with vibrant colors
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#667eea',
            light: '#8b9cff',
            dark: '#4d63c9',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#764ba2',
            light: '#9d6bc8',
            dark: '#5a3a7f',
            contrastText: '#ffffff',
        },
        success: {
            main: '#00f2fe',
            light: '#4facfe',
            dark: '#00c9d4',
        },
        warning: {
            main: '#fee140',
            light: '#fef280',
            dark: '#d4bc00',
        },
        error: {
            main: '#f5576c',
            light: '#ff8a99',
            dark: '#d43f53',
        },
        background: {
            default: '#0a0e27',
            paper: '#1a1f3a',
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '3rem',
            fontWeight: 700,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '2.5rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
            lineHeight: 1.5,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 500,
            lineHeight: 1.5,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0px 2px 4px rgba(0,0,0,0.1)',
        '0px 4px 8px rgba(0,0,0,0.12)',
        '0px 6px 12px rgba(0,0,0,0.15)',
        '0px 8px 16px rgba(0,0,0,0.18)',
        '0px 10px 20px rgba(0,0,0,0.2)',
        '0px 12px 24px rgba(0,0,0,0.22)',
        '0px 14px 28px rgba(0,0,0,0.25)',
        '0px 16px 32px rgba(0,0,0,0.28)',
        '0px 18px 36px rgba(0,0,0,0.3)',
        '0px 20px 40px rgba(0,0,0,0.32)',
        '0px 22px 44px rgba(0,0,0,0.35)',
        '0px 24px 48px rgba(0,0,0,0.38)',
        '0px 26px 52px rgba(0,0,0,0.4)',
        '0px 28px 56px rgba(0,0,0,0.42)',
        '0px 30px 60px rgba(0,0,0,0.45)',
        '0px 32px 64px rgba(0,0,0,0.48)',
        '0px 34px 68px rgba(0,0,0,0.5)',
        '0px 36px 72px rgba(0,0,0,0.52)',
        '0px 38px 76px rgba(0,0,0,0.55)',
        '0px 40px 80px rgba(0,0,0,0.58)',
        '0px 42px 84px rgba(0,0,0,0.6)',
        '0px 44px 88px rgba(0,0,0,0.62)',
        '0px 46px 92px rgba(0,0,0,0.65)',
        '0px 48px 96px rgba(0,0,0,0.68)',
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                        transform: 'translateY(-2px)',
                    },
                },
                contained: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    background: 'rgba(26, 31, 58, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px 0 rgba(102, 126, 234, 0.3)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: 'rgba(26, 31, 58, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
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
    },
});

export default theme;
