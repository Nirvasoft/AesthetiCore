import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme, lightTheme } from './theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
    mode: ThemeMode;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: 'dark',
    toggleTheme: () => { },
});

export const useThemeMode = () => useContext(ThemeContext);

const STORAGE_KEY = 'aestheticore-theme-mode';

function getInitialMode(): ThemeMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* SSR or private browsing */ }
    return 'dark'; // default
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(getInitialMode);

    const toggleTheme = () => {
        setMode(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
            return next;
        });
    };

    const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

    const value = useMemo(() => ({ mode, toggleTheme }), [mode]);

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
}
