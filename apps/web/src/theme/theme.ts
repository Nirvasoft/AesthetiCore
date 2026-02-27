import { createTheme, alpha } from '@mui/material';

// AesthetiCore brand palette — premium clinical aesthetic
const brand = {
    primary: '#6C63FF',     // Electric indigo
    secondary: '#FF6584',   // Rose accent
    success: '#2DD4BF',     // Teal
    warning: '#FBBF24',     // Amber
    error: '#F87171',       // Soft red
    bg: '#0F0E1A',          // Deep navy background
    surface: '#1A1929',     // Card surface
    surfaceAlt: '#231F35',  // Elevated surface
    border: '#2E2A45',      // Subtle border
    textPrimary: '#F1F0FF',
    textSecondary: '#9D9BBF',
};

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: brand.primary, contrastText: '#fff' },
        secondary: { main: brand.secondary },
        success: { main: brand.success },
        warning: { main: brand.warning },
        error: { main: brand.error },
        background: { default: brand.bg, paper: brand.surface },
        text: { primary: brand.textPrimary, secondary: brand.textSecondary },
        divider: brand.border,
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.01em' },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 20px',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                },
                containedPrimary: {
                    background: `linear-gradient(135deg, ${brand.primary}, #9B8FFF)`,
                    '&:hover': {
                        background: `linear-gradient(135deg, #5A52E0, ${brand.primary})`,
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: brand.surface,
                    border: `1px solid ${brand.border}`,
                    backgroundImage: 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: 'none' },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600 },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    backgroundColor: brand.surfaceAlt,
                    color: brand.textSecondary,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                },
            },
        },
        MuiTextField: {
            defaultProps: { variant: 'outlined', size: 'small' },
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha(brand.primary, 0.04),
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: brand.surface,
                    borderRight: `1px solid ${brand.border}`,
                },
            },
        },
    },
});
