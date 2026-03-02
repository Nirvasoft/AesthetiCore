import { createTheme, alpha } from '@mui/material';

// AesthetiCore brand palette — premium clinical aesthetic
const brandDark = {
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

const brandLight = {
    primary: '#5B52E5',     // Slightly deeper indigo for contrast
    secondary: '#E5426B',   // Rose accent
    success: '#0D9488',     // Teal
    warning: '#D97706',     // Amber
    error: '#DC2626',       // Red
    bg: '#F4F3FA',          // Soft lavender-gray background
    surface: '#FFFFFF',     // White card surface
    surfaceAlt: '#EDE9F7',  // Elevated surface — light purple tint
    border: '#E0DDF0',      // Subtle border
    textPrimary: '#1A1833', // Near-black with blue tone
    textSecondary: '#66648A', // Muted purple-gray
};

// ── Shared config ──
const sharedTypography = {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const },
};

const sharedShape = { borderRadius: 12 };

function buildComponents(brand: typeof brandDark) {
    return {
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
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                },
            },
        },
        MuiTextField: {
            defaultProps: { variant: 'outlined' as const, size: 'small' as const },
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
    };
}

// ── Dark theme (existing) ──
export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: brandDark.primary, contrastText: '#fff' },
        secondary: { main: brandDark.secondary },
        success: { main: brandDark.success },
        warning: { main: brandDark.warning },
        error: { main: brandDark.error },
        background: { default: brandDark.bg, paper: brandDark.surface },
        text: { primary: brandDark.textPrimary, secondary: brandDark.textSecondary },
        divider: brandDark.border,
    },
    typography: sharedTypography,
    shape: sharedShape,
    components: buildComponents(brandDark),
});

// ── Light theme ──
export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: brandLight.primary, contrastText: '#fff' },
        secondary: { main: brandLight.secondary },
        success: { main: brandLight.success },
        warning: { main: brandLight.warning },
        error: { main: brandLight.error },
        background: { default: brandLight.bg, paper: brandLight.surface },
        text: { primary: brandLight.textPrimary, secondary: brandLight.textSecondary },
        divider: brandLight.border,
    },
    typography: sharedTypography,
    shape: sharedShape,
    components: buildComponents(brandLight),
});

// Keep backward compat
export const theme = darkTheme;
