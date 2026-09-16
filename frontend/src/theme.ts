import { createTheme } from '@mui/material/styles';
import { color, radius, type } from './design/tokens';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: color.navy900,
            light: color.navy700,
            dark: color.navy950,
            contrastText: color.navInk,
        },
        secondary: {
            main: color.gold,
            contrastText: color.navy950,
        },
        success: { main: color.success, contrastText: '#fff' },
        warning: { main: color.warning, contrastText: '#fff' },
        error: { main: color.danger, contrastText: '#fff' },
        info: { main: color.info, contrastText: '#fff' },
        background: {
            default: color.workspace,
            paper: color.surface,
        },
        text: {
            primary: color.ink,
            secondary: color.inkMuted,
        },
        divider: color.line,
        action: {
            hover: 'rgba(20,32,46,0.04)',
            selected: color.goldDim,
            disabled: 'rgba(20,32,46,0.28)',
            disabledBackground: 'rgba(20,32,46,0.06)',
            focus: 'rgba(176,137,58,0.28)',
        },
    },
    typography: {
        fontFamily: type.ui,
        h1: { fontFamily: type.display, fontSize: '1.75rem', fontWeight: 550, lineHeight: 1.2, letterSpacing: '-0.02em' },
        h2: { fontFamily: type.display, fontSize: '1.55rem', fontWeight: 550, lineHeight: 1.25, letterSpacing: '-0.018em' },
        h3: { fontFamily: type.display, fontSize: '1.3rem', fontWeight: 550, lineHeight: 1.28 },
        h4: { fontFamily: type.display, fontSize: '1.15rem', fontWeight: 550, lineHeight: 1.3 },
        h5: { fontFamily: type.ui, fontSize: '1.02rem', fontWeight: 700, lineHeight: 1.35 },
        h6: { fontFamily: type.ui, fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.4 },
        subtitle1: { fontSize: '0.95rem', fontWeight: 650, lineHeight: 1.45 },
        subtitle2: { fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.4 },
        body1: { fontSize: '0.95rem', lineHeight: 1.55, fontWeight: 400 },
        body2: { fontSize: '0.875rem', lineHeight: 1.5, color: color.inkMuted },
        caption: { fontSize: '0.75rem', lineHeight: 1.4, color: color.inkMuted },
        overline: {
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: color.inkMuted,
        },
        button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0, fontSize: '0.875rem' },
    },
    shape: { borderRadius: radius.md },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: color.workspace,
                    color: color.ink,
                    scrollbarColor: `${color.navy600} ${color.workspace}`,
                },
                '*:focus-visible': {
                    outline: `2px solid ${color.focus}`,
                    outlineOffset: 2,
                },
            },
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: radius.md, padding: '8px 14px', minHeight: 36 },
                containedPrimary: {
                    backgroundColor: color.navy900,
                    color: color.navInk,
                    '&:hover': { backgroundColor: color.navy800 },
                },
                containedSecondary: {
                    backgroundColor: color.gold,
                    color: color.navy950,
                    '&:hover': { backgroundColor: color.goldSoft },
                },
                outlined: {
                    borderColor: color.lineStrong,
                    color: color.ink,
                    '&:hover': { borderColor: color.navy700, backgroundColor: 'rgba(20,32,46,0.03)' },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: color.surface,
                    border: `1px solid ${color.line}`,
                    borderRadius: radius.lg,
                    boxShadow: 'none',
                },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: color.surface,
                    border: `1px solid ${color.line}`,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: radius.sm, fontWeight: 700, height: 24, fontSize: '0.72rem' },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderBottom: `1px solid ${color.line}`, fontSize: '0.84rem', padding: '12px 14px' },
                head: {
                    fontWeight: 650,
                    fontSize: '0.78rem',
                    color: color.inkMuted,
                    backgroundColor: 'transparent',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: { '&:hover': { backgroundColor: 'rgba(20,32,46,0.03)' } },
            },
        },
        MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: color.surface,
                    '& fieldset': { borderColor: color.lineStrong },
                    '&.Mui-focused fieldset': { borderColor: color.navy700 },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: { backgroundColor: color.surface, borderRadius: radius.lg },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: { backgroundColor: color.surface, borderLeft: `1px solid ${color.lineStrong}` },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: radius.md },
            },
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    color: color.inkMuted,
                    '&.Mui-disabled': { color: color.inkMuted },
                },
            },
        },
        MuiTabs: { styleOverrides: { indicator: { backgroundColor: color.gold, height: 2 } } },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 700,
                    minHeight: 44,
                    color: color.inkMuted,
                    '&.Mui-selected': { color: color.ink },
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: { backgroundColor: color.surfaceMuted, borderRadius: radius.sm, height: 6 },
                bar: { backgroundColor: color.navy800 },
            },
        },
    },
});

export default theme;
